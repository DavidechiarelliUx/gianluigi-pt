import { prisma } from "../../server/lib/prisma.js";
import { requireAuth } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";

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

function orderAccess(order) {
  const bookedCount = order.bookings?.filter((booking) => booking.status === "confirmed").length || 0;
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

/** GET /api/client/overview — pacchetto attivo + accesso live/pagamenti. */
async function overview(req, res, auth) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!clientOnly(auth, res)) return;

  try {
    const orders = await prisma.order.findMany({
      where: { userId: auth.userId, status: "paid" },
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        bookings: { where: { status: "confirmed" }, select: { id: true } },
      },
    });
    const activeOrder = orders[0] || null;
    return res.status(200).json({
      ok: true,
      activePackage: activeOrder ? orderAccess(activeOrder) : null,
      orders: orders.map(orderAccess),
      hasPaidAccess: orders.length > 0,
    });
  } catch (err) {
    console.error("GET /api/client/overview:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

/** GET /api/client/progress — trend esercizi derivato dalle sessioni salvate. */
async function progress(req, res, auth) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!clientOnly(auth, res)) return;

  try {
    const sessions = await prisma.workoutSession.findMany({
      where: { clientId: auth.clientId, status: "completed" },
      orderBy: { date: "asc" },
      include: {
        itemLogs: true,
        workout: {
          include: {
            days: {
              include: {
                items: {
                  include: { exercise: true },
                },
              },
            },
          },
        },
      },
    });

    const itemById = new Map();
    for (const session of sessions) {
      for (const day of session.workout.days) {
        for (const item of day.items) {
          itemById.set(item.id, item);
        }
      }
    }

    const byExercise = new Map();
    for (const session of sessions) {
      for (const log of session.itemLogs) {
        const item = itemById.get(log.workoutItemId);
        if (!item) continue;
        const name = item.exercise.name;
        if (!byExercise.has(name)) {
          byExercise.set(name, {
            name,
            muscleGroup: item.exercise.muscleGroup,
            bestLoad: null,
            latestLoad: null,
            completedSessions: 0,
            history: [],
          });
        }
        const entry = byExercise.get(name);
        const loadNumber = parseLoad(log.loadUsed);
        if (log.completed) entry.completedSessions += 1;
        if (loadNumber != null) {
          entry.latestLoad = loadNumber;
          entry.bestLoad = entry.bestLoad == null ? loadNumber : Math.max(entry.bestLoad, loadNumber);
        }
        entry.history.push({
          date: session.date,
          completed: log.completed,
          loadUsed: log.loadUsed,
          loadNumber,
          repsDone: log.repsDone,
          rpe: log.perceivedDifficulty,
        });
      }
    }

    const exercises = [...byExercise.values()]
      .map((item) => ({
        ...item,
        improvement:
          item.history.filter((point) => point.loadNumber != null).length >= 2
            ? item.history.filter((point) => point.loadNumber != null).at(-1).loadNumber -
              item.history.filter((point) => point.loadNumber != null)[0].loadNumber
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

/** GET/POST /api/client/metrics — misure, peso e foto URL. */
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

/** GET/POST /api/client/messages — richieste al coach. */
async function messages(req, res, auth) {
  if (!clientOnly(auth, res)) return;

  if (req.method === "GET") {
    try {
      const list = await prisma.coachMessage.findMany({
        where: { clientId: auth.clientId },
        orderBy: { createdAt: "desc" },
        take: 10,
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
        data: { clientId: auth.clientId, subject, message },
      });
      return res.status(201).json({ ok: true, message: created });
    } catch (err) {
      console.error("POST /api/client/messages:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}

/** GET /api/client/active-workout — scheda attiva + ultime sessioni del cliente. */
async function activeWorkout(req, res, auth) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (!clientOnly(auth, res)) return;

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
      take: 8,
      include: { itemLogs: true },
    });
    return res.status(200).json({ ok: true, workout, sessions });
  } catch (err) {
    console.error("GET /api/client/active-workout:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

/** POST /api/client/sessions — salva una sessione di allenamento completata. */
async function sessions(req, res, auth) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!clientOnly(auth, res)) return;

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

    const itemIds = new Set(workout.days.flatMap((day) => day.items.map((item) => item.id)));
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

export default function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const { action } = req.query;
  if (action === "overview") return overview(req, res, auth);
  if (action === "active-workout") return activeWorkout(req, res, auth);
  if (action === "progress") return progress(req, res, auth);
  if (action === "metrics") return metrics(req, res, auth);
  if (action === "messages") return messages(req, res, auth);
  if (action === "sessions") return sessions(req, res, auth);
  return res.status(404).json({ ok: false, error: "Endpoint non trovato" });
}
