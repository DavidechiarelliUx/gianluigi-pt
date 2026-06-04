import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";

/**
 * GET  /api/workouts?clientId=xxx  → schede di un cliente
 * POST /api/workouts               → crea scheda (con giorni ed esercizi opzionali)
 */
export default async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  /* ---- GET ---- */
  if (req.method === "GET") {
    const { clientId } = req.query;
    if (!clientId) return res.status(400).json({ ok: false, error: "clientId obbligatorio" });

    try {
      const workouts = await prisma.workout.findMany({
        where: { clientId },
        include: {
          days: {
            orderBy: { order: "asc" },
            include: {
              items: {
                orderBy: { order: "asc" },
                include: { exercise: true },
              },
            },
          },
          _count: { select: { sessions: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      });
      return res.status(200).json({ ok: true, workouts });
    } catch (err) {
      console.error("GET /api/workouts:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  /* ---- POST ---- */
  if (req.method === "POST") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });
    const { clientId, title, description, days = [] } = body || {};
    if (!clientId || !title?.trim()) {
      return res.status(400).json({ ok: false, error: "clientId e titolo obbligatori" });
    }

    try {
      const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } });
      if (!client) return res.status(404).json({ ok: false, error: "Cliente non trovato" });

      const workout = await prisma.$transaction(async (tx) => {
        await tx.workout.updateMany({
          where: { clientId, status: "active" },
          data: { status: "archived", archivedAt: new Date() },
        });
        return tx.workout.create({
          data: {
            clientId,
            title: title.trim(),
            description: description?.trim() || null,
            status: "active",
            days: {
              create: days.map((day, dayIndex) => ({
                label: day.label?.trim() || `Giorno ${dayIndex + 1}`,
                order: dayIndex,
                items: {
                  create: (day.items || []).map((item, itemIndex) => ({
                    exerciseId: item.exerciseId,
                    sets: Number(item.sets) || 3,
                    reps: String(item.reps || "8-10"),
                    restSeconds: item.restSeconds ? Number(item.restSeconds) : null,
                    notes: item.notes?.trim() || null,
                    order: itemIndex,
                  })),
                },
              })),
            },
          },
          include: {
            days: {
              orderBy: { order: "asc" },
              include: { items: { orderBy: { order: "asc" }, include: { exercise: true } } },
            },
          },
        });
      });
      return res.status(201).json({ ok: true, workout });
    } catch (err) {
      console.error("POST /api/workouts:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
