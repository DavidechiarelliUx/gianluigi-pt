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
  if (action === "active-workout") return activeWorkout(req, res, auth);
  if (action === "sessions") return sessions(req, res, auth);
  return res.status(404).json({ ok: false, error: "Endpoint non trovato" });
}
