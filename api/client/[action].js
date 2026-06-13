import { prisma } from "../../server/lib/prisma.js";
import { requireAuth } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";
import { getClientEntitlements, publicEntitlements, canAccess } from "../../server/lib/access.js";
import { getLiveCreditSummary } from "../../server/lib/live-credits.js";

function clientOnly(auth, res) {
  if (auth.role !== "client" || !auth.clientId) {
    res.status(403).json({ ok: false, error: "Area riservata ai clienti" });
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
    const [entitlements, orders, liveCredits] = await Promise.all([
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
        itemLogs: true,
        workout: { include: { days: { include: { items: { include: { exercise: true } } } } } },
      },
    });

    const itemById = new Map();
    for (const s of sessions) {
      for (const day of s.workout.days) {
        for (const item of day.items) itemById.set(item.id, item);
      }
    }

    const byExercise = new Map();
    for (const s of sessions) {
      for (const log of s.itemLogs) {
        const item = itemById.get(log.workoutItemId);
        if (!item) continue;
        const name = item.exercise.name;
        if (!byExercise.has(name)) {
          byExercise.set(name, { name, muscleGroup: item.exercise.muscleGroup, bestLoad: null, latestLoad: null, completedSessions: 0, history: [] });
        }
        const entry = byExercise.get(name);
        const loadNumber = parseLoad(log.loadUsed);
        if (log.completed) entry.completedSessions += 1;
        if (loadNumber != null) {
          entry.latestLoad = loadNumber;
          entry.bestLoad = entry.bestLoad == null ? loadNumber : Math.max(entry.bestLoad, loadNumber);
        }
        entry.history.push({ date: s.date, completed: log.completed, loadUsed: log.loadUsed, loadNumber, repsDone: log.repsDone, rpe: log.perceivedDifficulty });
      }
    }

    const exercises = [...byExercise.values()]
      .map((e) => ({
        ...e,
        improvement: e.history.filter((h) => h.loadNumber != null).length >= 2
          ? e.history.filter((h) => h.loadNumber != null).at(-1).loadNumber -
            e.history.filter((h) => h.loadNumber != null)[0].loadNumber
          : null,
      }))
      .sort((a, b) => (b.bestLoad || 0) - (a.bestLoad || 0))
      .slice(0, 8);

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
    const sessions = await prisma.workoutSession.findMany({
      where: { clientId: auth.clientId, status: "completed" },
      orderBy: { date: "desc" },
      take: 52,
      include: { itemLogs: true },
    });
    return res.status(200).json({ ok: true, workout, sessions, access: "granted" });
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

  const { workoutId, workoutDayId, feedbackDifficulty, feedbackNotes, logs = [] } = body;
  if (!workoutId || !workoutDayId) {
    return res.status(400).json({ ok: false, error: "Scheda e giorno obbligatori" });
  }

  try {
    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, clientId: auth.clientId, status: "active" },
      include: { days: { include: { items: true } } },
    });
    if (!workout) return res.status(404).json({ ok: false, error: "Scheda attiva non trovata" });

    const itemIds = new Set(workout.days.flatMap((d) => d.items.map((i) => i.id)));
    const safeLogs = logs.filter((log) => itemIds.has(log.workoutItemId));

    const session = await prisma.workoutSession.create({
      data: {
        clientId: auth.clientId,
        workoutId,
        workoutDayId,
        status: "completed",
        feedbackDifficulty: feedbackDifficulty ? Number(feedbackDifficulty) : null,
        feedbackNotes: feedbackNotes?.trim() || null,
        itemLogs: {
          create: safeLogs.map((log) => ({
            workoutItemId: log.workoutItemId,
            completed: !!log.completed,
            loadUsed: log.loadUsed?.trim() || null,
            repsDone: log.repsDone?.trim() || null,
            perceivedDifficulty: log.rpe ? Number(log.rpe) : null,
            notes: log.notes?.trim() || null,
          })),
        },
      },
      include: { itemLogs: true },
    });
    return res.status(201).json({ ok: true, session });
  } catch (err) {
    console.error("POST /api/client/sessions:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const { action } = req.query;
  if (action === "overview")       return overview(req, res, auth);
  if (action === "active-workout") return activeWorkout(req, res, auth);
  if (action === "progress")       return progress(req, res, auth);
  if (action === "metrics")        return metrics(req, res, auth);
  if (action === "messages")       return messages(req, res, auth);
  if (action === "sessions")       return sessions(req, res, auth);
  return res.status(404).json({ ok: false, error: "Endpoint non trovato" });
}
