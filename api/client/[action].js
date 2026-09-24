import { prisma } from "../../server/lib/prisma.js";
import { requireAuth } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";
import { getClientEntitlements, publicEntitlements, canAccess } from "../../server/lib/access.js";
import { getLiveCreditSummary } from "../../server/lib/live-credits.js";
import { latestResultsByItem, normalizeDraftState, normalizeSetLogs, romeWeekStart } from "../../server/lib/workout-records.js";

function clientOnly(auth, res) {
  if (auth.role !== "client" || !auth.clientId) {
    res.status(403).json({ ok: false, error: "Area riservata ai clienti" });
    return false;
  }
  return true;
}

async function activeClientOnly(auth, res) {
  if (!clientOnly(auth, res)) return false;
  const client = await prisma.client.findUnique({
    where: { id: auth.clientId },
    select: { deletedAt: true, accessDisabledAt: true },
  });
  if (!client || client.deletedAt || client.accessDisabledAt) {
    res.status(403).json({
      ok: false,
      error: client?.accessDisabledAt
        ? "Accesso app chiuso dal trainer. Contatta il coach per riattivarlo."
        : "Accesso cliente non disponibile.",
    });
    return false;
  }
  return true;
}

function parseOptionalNumber(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLoad(value) {
  if (!value) return null;
  const match = String(value).replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

/** Mappa un ordine nel formato legacy `activePackage` (backward compat). */
function orderAccess(order) {
  const bookedCount = order.bookings?.filter((b) => b.status === "confirmed").length || 0;
  const sessionsQty = order.sessionsQty ?? null;
  return {
    id: order.id,
    productName: order.product?.name || "Pacchetto",
    productType: order.product?.type || null,
    amountCents: order.amountCents,
    currency: order.currency,
    quantity: order.quantity,
    sessionsQty,
    usedSessions: bookedCount,
    remainingSessions: sessionsQty == null ? null : Math.max(0, sessionsQty - bookedCount),
    purchasedAt: order.createdAt,
  };
}

// ─── GET /api/client/overview ─────────────────────────────────────────────────

/** Panoramica cliente: abbonamento attivo, accesso, ordini. */
async function overview(req, res, auth) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!clientOnly(auth, res)) return;

  try {
    const [entitlements, orders, liveCredits, client, totalSessions] = await Promise.all([
      getClientEntitlements(auth.userId),
      prisma.order.findMany({
        where: { userId: auth.userId, status: "paid" },
        orderBy: { createdAt: "desc" },
        include: {
          product: true,
          bookings: { where: { status: "confirmed" }, select: { id: true } },
        },
      }),
      getLiveCreditSummary(auth.clientId),
      prisma.client.findUnique({ where: { id: auth.clientId }, select: { goal: true } }),
      prisma.workoutSession.count({ where: { clientId: auth.clientId, status: "completed", itemLogs: { some: { completed: true } } } }),
    ]);

    const activeOrder = orders[0] || null;
    const pub = publicEntitlements(entitlements);

    return res.status(200).json({
      ok: true,
      // ── Nuovi campi abbonamento (Fase 4) ──────────────────────────────────
      subscription: {
        status:            pub.status,
        accessLevel:       pub.accessLevel,
        productName:       pub.productName,
        currentPeriodStart: pub.currentPeriodStart,
        renewsAt:          pub.renewsAt,
        validUntil:        pub.validUntil,
        cancelAtPeriodEnd: pub.cancelAtPeriodEnd,
        isPastDue:         pub.isPastDue,
        source:            pub.source,
      },
      hasAccess:        pub.hasAccess,
      hasAppAccess:     pub.hasAppAccess,
      hasLiveAccess:    pub.hasLiveAccess,
      hasPremiumAccess: pub.hasPremiumAccess,
      // ── Backward compat ───────────────────────────────────────────────────
      activePackage: activeOrder ? orderAccess(activeOrder) : null,
      orders: orders.map(orderAccess),
      liveCredits,
      goal: client?.goal || null,
      totalSessions,
      hasPaidAccess: orders.length > 0 || entitlements.hasAccess,
    });
  } catch (err) {
    console.error("GET /api/client/overview:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── GET /api/client/progress ─────────────────────────────────────────────────

async function progress(req, res, auth) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!clientOnly(auth, res)) return;

  try {
    const sessions = await prisma.workoutSession.findMany({
      where: { clientId: auth.clientId, status: "completed" },
      orderBy: { date: "asc" },
      include: {
        itemLogs: { include: { sets: { orderBy: { setIndex: "asc" } } } },
        workout: { include: { days: { include: { items: { include: { exercise: true } } } } } },
      },
    });

    const itemById = new Map();
    for (const s of sessions) {
      for (const day of s.workout.days) {
        for (const item of day.items) itemById.set(item.id, item);
      }
    }
    const missingExerciseIds = [...new Set(sessions.flatMap((session) => session.itemLogs
      .filter((log) => !itemById.has(log.workoutItemId) && log.exerciseId)
      .map((log) => log.exerciseId)))];
    const historicalExercises = missingExerciseIds.length
      ? await prisma.exercise.findMany({ where: { id: { in: missingExerciseIds } } })
      : [];
    const exerciseById = new Map(historicalExercises.map((exercise) => [exercise.id, exercise]));

    const byExercise = new Map();
    for (const s of sessions) {
      for (const log of s.itemLogs) {
        if (!log.completed) continue;
        const item = itemById.get(log.workoutItemId);
        const exercise = item?.exercise || exerciseById.get(log.exerciseId);
        if (!exercise) continue;
        const name = exercise.name;
        if (!byExercise.has(name)) {
          byExercise.set(name, { name, muscleGroup: exercise.muscleGroup, bestLoad: null, latestLoad: null, completedSessions: 0, history: [] });
        }
        const entry = byExercise.get(name);
        // Solo i carichi veri entrano nella progressione: i minuti della cyclette
        // non sono kg, e prima parseLoad() leggeva "10min" come un carico di 10.
        const unit = log.loadUnit ?? item?.loadType;
        const setLoads = (log.sets || []).map((set) => set.loadValue).filter((value) => Number.isFinite(value));
        const loadNumber = unit === "weight"
          ? (setLoads.length ? Math.max(...setLoads) : log.loadValue ?? parseLoad(log.loadUsed))
          : null;
        if (loadNumber != null) {
          entry.bestLoad = entry.bestLoad == null ? loadNumber : Math.max(entry.bestLoad, loadNumber);
        }
        entry.history.push({ sessionId: s.id, date: s.date, completed: log.completed, loadUsed: log.loadUsed, loadNumber, repsDone: log.repsDone, rpe: log.perceivedDifficulty, sets: log.sets });
      }
    }

    const exercises = [...byExercise.values()]
      .map((e) => {
        const loadBySession = new Map();
        for (const record of e.history) {
          if (record.loadNumber == null) continue;
          loadBySession.set(record.sessionId, Math.max(loadBySession.get(record.sessionId) ?? 0, record.loadNumber));
        }
        const loadHist = [...loadBySession.values()];
        return {
          ...e,
          completedSessions: new Set(e.history.map((record) => record.sessionId)).size,
          latestLoad: loadHist.at(-1) ?? null,
          improvement: loadHist.length >= 2
            ? loadHist.at(-1) - loadHist[0]
            : null,
        };
      })
      .sort((a, b) => (b.bestLoad || 0) - (a.bestLoad || 0));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, exercises });
  } catch (err) {
    console.error("GET /api/client/progress:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── GET|POST /api/client/metrics ─────────────────────────────────────────────

async function metrics(req, res, auth) {
  if (!clientOnly(auth, res)) return;

  if (req.method === "GET") {
    try {
      const list = await prisma.clientMetric.findMany({
        where: { clientId: auth.clientId },
        orderBy: { date: "desc" },
        take: 12,
      });
      return res.status(200).json({ ok: true, metrics: list });
    } catch (err) {
      console.error("GET /api/client/metrics:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "POST") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });
    try {
      const metric = await prisma.clientMetric.create({
        data: {
          clientId: auth.clientId,
          date: body.date ? new Date(body.date) : new Date(),
          weightKg: parseOptionalNumber(body.weightKg),
          waistCm: parseOptionalNumber(body.waistCm),
          chestCm: parseOptionalNumber(body.chestCm),
          hipsCm: parseOptionalNumber(body.hipsCm),
          photoUrl: body.photoUrl?.trim() || null,
          notes: body.notes?.trim() || null,
        },
      });
      return res.status(201).json({ ok: true, metric });
    } catch (err) {
      console.error("POST /api/client/metrics:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}

// ─── GET|POST /api/client/messages ────────────────────────────────────────────

async function messages(req, res, auth) {
  if (!clientOnly(auth, res)) return;

  if (req.method === "GET") {
    try {
      const list = await prisma.coachMessage.findMany({
        where: { clientId: auth.clientId, hiddenAt: null },
        orderBy: { createdAt: "asc" },
        take: 80,
      });
      return res.status(200).json({ ok: true, messages: list });
    } catch (err) {
      console.error("GET /api/client/messages:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "POST") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });
    const subject = body.subject?.trim();
    const message = body.message?.trim();
    if (!subject || !message || subject.length < 3 || message.length < 8) {
      return res.status(400).json({ ok: false, error: "Oggetto e messaggio sono obbligatori" });
    }
    try {
      const created = await prisma.coachMessage.create({
        data: {
          clientId: auth.clientId,
          subject,
          message,
          senderRole: "client",
          status: "open",
        },
      });
      return res.status(201).json({ ok: true, message: created });
    } catch (err) {
      console.error("POST /api/client/messages:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}

// ─── GET|PUT /api/client/workout-draft ───────────────────────────────────────

async function workoutDraft(req, res, auth) {
  if (!["GET", "PUT"].includes(req.method)) return methodNotAllowed(res, ["GET", "PUT"]);
  if (!clientOnly(auth, res)) return;
  const entitlements = await getClientEntitlements(auth.userId);
  if (!canAccess(entitlements, "app")) return res.status(403).json({ ok: false, error: "Accesso alla scheda non attivo" });
  const body = req.method === "PUT" ? parseJsonBody(req) : req.query;
  const workoutId = String(body?.workoutId || "");
  const workoutDayId = String(body?.workoutDayId || "");
  if (!workoutId || !workoutDayId) return res.status(400).json({ ok: false, error: "Scheda e giorno obbligatori" });

  try {
    const day = await prisma.workoutDay.findFirst({
      where: { id: workoutDayId, workoutId, workout: { clientId: auth.clientId, status: "active" } },
      include: { items: { select: { id: true, loadType: true, sets: true } } },
    });
    if (!day) return res.status(404).json({ ok: false, error: "Giorno della scheda non trovato" });
    const where = { clientId_workoutId_workoutDayId: { clientId: auth.clientId, workoutId, workoutDayId } };
    if (req.method === "GET") {
      const draft = await prisma.workoutDraft.findUnique({ where });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, draft });
    }

    let state;
    try { state = normalizeDraftState(body?.state, new Map(day.items.map((item) => [item.id, item]))); }
    catch (error) { return res.status(400).json({ ok: false, error: error.message }); }
    const completed = await prisma.workoutSession.findUnique({ where: { submissionId: state.submissionId }, select: { clientId: true } });
    if (completed) return res.status(409).json({ ok: false, error: "Sessione già completata", completed: true });
    const revision = Number(body?.revision);
    if (!Number.isInteger(revision) || revision < 0) return res.status(400).json({ ok: false, error: "Revisione bozza non valida" });
    const existing = await prisma.workoutDraft.findUnique({ where });
    if (existing && existing.revision !== revision) {
      return res.status(409).json({ ok: false, error: "Bozza modificata su un altro dispositivo", draft: existing });
    }
    if (!existing && revision !== 0) {
      return res.status(409).json({ ok: false, error: "Bozza già completata o rimossa", draft: null });
    }
    let draft;
    if (existing) {
      const updated = await prisma.workoutDraft.updateMany({ where: { id: existing.id, revision }, data: { state, revision: { increment: 1 } } });
      if (!updated.count) {
        draft = await prisma.workoutDraft.findUnique({ where });
        return res.status(409).json({ ok: false, error: "Bozza modificata su un altro dispositivo", draft });
      }
      draft = await prisma.workoutDraft.findUnique({ where });
    } else {
      try {
        draft = await prisma.workoutDraft.create({ data: { clientId: auth.clientId, workoutId, workoutDayId, state, revision: 1 } });
      } catch (error) {
        if (error.code !== "P2002") throw error;
        draft = await prisma.workoutDraft.findUnique({ where });
        return res.status(409).json({ ok: false, error: "Bozza modificata su un altro dispositivo", draft });
      }
    }
    return res.status(200).json({ ok: true, draft });
  } catch (error) {
    console.error("/api/client/workout-draft:", error);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── GET|POST /api/client/check-ins ──────────────────────────────────────────

async function checkIns(req, res, auth) {
  if (!["GET", "POST"].includes(req.method)) return methodNotAllowed(res, ["GET", "POST"]);
  if (!clientOnly(auth, res)) return;
  const weekStart = romeWeekStart();
  try {
    if (req.method === "GET") {
      const list = await prisma.clientCheckIn.findMany({ where: { clientId: auth.clientId }, orderBy: { weekStart: "desc" }, take: 8 });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, current: list.find((entry) => entry.weekStart.getTime() === weekStart.getTime()) || null, checkIns: list });
    }
    const body = parseJsonBody(req);
    const energy = Number(body?.energy);
    const difficulty = Number(body?.difficulty);
    const obstacle = String(body?.obstacle || "").trim();
    if (![energy, difficulty].every((value) => Number.isInteger(value) && value >= 1 && value <= 5) || obstacle.length > 500) {
      return res.status(400).json({ ok: false, error: "Valori del check-in non validi" });
    }
    const where = { clientId_weekStart: { clientId: auth.clientId, weekStart } };
    const existing = await prisma.clientCheckIn.findUnique({ where });
    if (existing?.reviewedAt) return res.status(409).json({ ok: false, error: "Il coach ha già risposto al check-in" });
    let checkIn;
    if (existing) {
      const updated = await prisma.clientCheckIn.updateMany({ where: { id: existing.id, reviewedAt: null }, data: { energy, difficulty, obstacle: obstacle || null } });
      if (!updated.count) return res.status(409).json({ ok: false, error: "Il coach ha già risposto al check-in" });
      checkIn = await prisma.clientCheckIn.findUnique({ where });
    } else {
      checkIn = await prisma.clientCheckIn.create({ data: { clientId: auth.clientId, weekStart, energy, difficulty, obstacle: obstacle || null } });
    }
    return res.status(200).json({ ok: true, checkIn });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ ok: false, error: "Check-in aggiornato da un altro dispositivo. Ricarica e riprova." });
    console.error("/api/client/check-ins:", error);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── GET /api/client/active-workout ───────────────────────────────────────────

async function activeWorkout(req, res, auth) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!clientOnly(auth, res)) return;

  // Controlla accesso alla scheda
  const entitlements = await getClientEntitlements(auth.userId);
  if (!canAccess(entitlements, "app")) {
    return res.status(200).json({
      ok: true,
      workout: null,
      sessions: [],
      access: "upgrade_required",
      accessLevel: entitlements.accessLevel,
      message: "Abbonamento non attivo o non include l'accesso alle schede.",
    });
  }

  try {
    const workout = await prisma.workout.findFirst({
      where: { clientId: auth.clientId, status: "active" },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: { items: { orderBy: { order: "asc" }, include: { exercise: true } } },
        },
      },
    });
    const currentItems = workout?.days.flatMap((day) => day.items) || [];
    const [rawSessions, totalSessions, totalWorkoutSessions, historyLogs] = await Promise.all([
      prisma.workoutSession.findMany({
        where: { clientId: auth.clientId, status: "completed" },
        orderBy: { date: "desc" },
        take: 52,
        include: {
          itemLogs: true,
          workout: { select: { days: { select: { id: true } } } },
        },
      }),
      prisma.workoutSession.count({ where: { clientId: auth.clientId, status: "completed", itemLogs: { some: { completed: true } } } }),
      workout ? prisma.workoutSession.count({ where: { clientId: auth.clientId, workoutId: workout.id, status: "completed", itemLogs: { some: { completed: true } } } }) : 0,
      currentItems.length ? prisma.workoutItemLog.findMany({
        where: {
          completed: true,
          skipped: false,
          session: { is: { clientId: auth.clientId, status: "completed" } },
          OR: [
            { workoutItemId: { in: currentItems.map((item) => item.id) } },
            { exerciseId: { in: [...new Set(currentItems.map((item) => item.exerciseId))] } },
          ],
        },
        include: {
          session: { select: { date: true, workoutDayId: true } },
          sets: { orderBy: { setIndex: "asc" } },
        },
        orderBy: { session: { date: "desc" } },
      }) : [],
    ]);
    const lastMaximalByItemId = latestResultsByItem(workout, historyLogs);

    // Stacca workout dalle sessioni (il client non ne ha bisogno), ma conserva
    // quanti giorni aveva la scheda usata: serve alla streak per valutare ogni
    // settimana con l'obiettivo in vigore allora, non con quello di oggi.
    // planDays e' ora congelato sulla sessione; il conteggio dalla scheda resta
    // come fallback per le sessioni salvate prima della migration.
    const sessions = rawSessions.map(({ workout: w, ...rest }) => ({
      ...rest,
      planDays: rest.planDays ?? w?.days?.length ?? null,
    }));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, workout, sessions, totalSessions, totalWorkoutSessions, lastMaximalByItemId, access: "granted" });
  } catch (err) {
    console.error("GET /api/client/active-workout:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── POST /api/client/sessions ────────────────────────────────────────────────

async function sessions(req, res, auth) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!clientOnly(auth, res)) return;

  // Controlla accesso alla scheda
  const entitlements = await getClientEntitlements(auth.userId);
  if (!canAccess(entitlements, "app")) {
    return res.status(403).json({ ok: false, error: "Abbonamento non attivo o non include l'accesso alle schede." });
  }

  const body = parseJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });

  const { workoutId, workoutDayId, feedbackDifficulty, feedbackNotes, logs = [], submissionId } = body;
  if (!workoutId || !workoutDayId) {
    return res.status(400).json({ ok: false, error: "Scheda e giorno obbligatori" });
  }
  if (!Array.isArray(logs) || (submissionId != null && (typeof submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)))) {
    return res.status(400).json({ ok: false, error: "Dati sessione non validi" });
  }
  if (String(feedbackNotes || "").length > 2000) return res.status(400).json({ ok: false, error: "Feedback troppo lungo" });

  try {
    if (submissionId) {
      const prior = await prisma.workoutSession.findUnique({ where: { submissionId }, include: { itemLogs: true } });
      if (prior) return prior.clientId === auth.clientId
        ? res.status(200).json({ ok: true, session: prior, alreadySaved: true })
        : res.status(409).json({ ok: false, error: "Identificativo sessione già usato" });
    }
    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, clientId: auth.clientId, status: "active" },
      include: { days: { include: { items: true } } },
    });
    if (!workout) return res.status(404).json({ ok: false, error: "Scheda attiva non trovata" });

    // Il tipo di carico e l'esercizio arrivano dalla scheda, non dal client:
    // il payload non puo' dichiarare di aver fatto un esercizio diverso.
    const day = workout.days.find((entry) => entry.id === workoutDayId);
    if (!day) return res.status(400).json({ ok: false, error: "Giorno non valido" });
    const itemById = new Map(day.items.map((item) => [item.id, item]));
    if (logs.length > day.items.length || logs.some((log) => !log || typeof log !== "object" || !itemById.has(log.workoutItemId)) || new Set(logs.map((log) => log.workoutItemId)).size !== logs.length) {
      return res.status(400).json({ ok: false, error: "Esercizi della sessione non validi" });
    }
    let safeLogs;
    try {
      safeLogs = logs.map((log) => {
        const item = itemById.get(log.workoutItemId);
        const sets = log.completed && !log.skipped ? normalizeSetLogs(log.sets, item.loadType, item.sets) : [];
        const loadValues = sets.map((set) => set.loadValue).filter((value) => value != null);
        const legacyValue = Number(String(log.loadValue ?? "").replace(",", "."));
        const rpe = log.rpe == null || log.rpe === "" ? null : Number(log.rpe);
        if (rpe != null && (!Number.isInteger(rpe) || rpe < 1 || rpe > 10)) throw new Error("RPE non valido");
        if (String(log.loadUsed || "").length > 1000 || String(log.notes || "").length > 1000) throw new Error("Testo esercizio troppo lungo");
        return {
          workoutItemId: item.id,
          exerciseId: item.exerciseId,
          completed: !!log.completed,
          skipped: !!log.skipped,
          loadUsed: log.completed ? String(log.loadUsed || "").trim() || null : null,
          loadValue: item.loadType === "weight"
            ? (loadValues.length ? Math.max(...loadValues) : Number.isFinite(legacyValue) && legacyValue > 0 ? legacyValue : null)
            : item.loadType === "time" && Number.isFinite(legacyValue) && legacyValue > 0 ? legacyValue : null,
          loadUnit: item.loadType,
          repsDone: log.completed ? String(log.repsDone || "").trim() || null : null,
          perceivedDifficulty: rpe,
          notes: log.completed ? String(log.notes || "").trim() || null : null,
          sets: sets.length ? { create: sets } : undefined,
        };
      });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.workoutSession.create({
        data: {
          submissionId: submissionId || null,
          clientId: auth.clientId,
          workoutId,
          workoutDayId,
          planDays: workout.days.length,
          status: "completed",
          feedbackDifficulty: feedbackDifficulty ? Number(feedbackDifficulty) : null,
          feedbackNotes: String(feedbackNotes || "").trim() || null,
          itemLogs: { create: safeLogs },
        },
        include: { itemLogs: true },
      });
      await tx.workoutDraft.deleteMany({ where: { clientId: auth.clientId, workoutId, workoutDayId } });
      return created;
    });
    return res.status(201).json({ ok: true, session });
  } catch (err) {
    if (err.code === "P2002" && submissionId) {
      const prior = await prisma.workoutSession.findUnique({ where: { submissionId }, include: { itemLogs: true } });
      if (prior?.clientId === auth.clientId) return res.status(200).json({ ok: true, session: prior, alreadySaved: true });
    }
    console.error("POST /api/client/sessions:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  if (auth.role === "client" && !(await activeClientOnly(auth, res))) return;

  const { action } = req.query;
  if (action === "overview")       return overview(req, res, auth);
  if (action === "active-workout") return activeWorkout(req, res, auth);
  if (action === "workout-draft") return workoutDraft(req, res, auth);
  if (action === "check-ins")     return checkIns(req, res, auth);
  if (action === "progress")       return progress(req, res, auth);
  if (action === "metrics")        return metrics(req, res, auth);
  if (action === "messages")       return messages(req, res, auth);
  if (action === "sessions")       return sessions(req, res, auth);
  return res.status(404).json({ ok: false, error: "Endpoint non trovato" });
}
