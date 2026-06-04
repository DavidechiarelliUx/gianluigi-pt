import { prisma } from "../../server/lib/prisma.js";
import { requireAuth } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";

export default async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  if (auth.role !== "client" || !auth.clientId) {
    return res.status(403).json({ ok: false, error: "Area riservata ai clienti" });
  }
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

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

    const itemIds = new Set(
      workout.days.flatMap((day) => day.items.map((item) => item.id))
    );
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
