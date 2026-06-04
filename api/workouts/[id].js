import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";

const includeWorkout = {
  client: { include: { user: { select: { fullName: true, email: true } } } },
  days: {
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" }, include: { exercise: true } } },
  },
  _count: { select: { sessions: true } },
};

async function replaceDays(tx, workoutId, days = []) {
  await tx.workoutDay.deleteMany({ where: { workoutId } });
  for (const [dayIndex, day] of days.entries()) {
    await tx.workoutDay.create({
      data: {
        workoutId,
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
      },
    });
  }
}

export default async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const workout = await prisma.workout.findUnique({ where: { id }, include: includeWorkout });
      if (!workout) return res.status(404).json({ ok: false, error: "Scheda non trovata" });
      return res.status(200).json({ ok: true, workout });
    } catch (err) {
      console.error("GET /api/workouts/[id]:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "PUT") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });
    const { title, description, status, days } = body;

    try {
      const current = await prisma.workout.findUnique({ where: { id } });
      if (!current) return res.status(404).json({ ok: false, error: "Scheda non trovata" });

      const workout = await prisma.$transaction(async (tx) => {
        if (status === "active") {
          await tx.workout.updateMany({
            where: { clientId: current.clientId, status: "active", NOT: { id } },
            data: { status: "archived", archivedAt: new Date() },
          });
        }

        await tx.workout.update({
          where: { id },
          data: {
            title: title?.trim() || current.title,
            description: description?.trim() || null,
            status: status === "archived" ? "archived" : status === "active" ? "active" : current.status,
            archivedAt:
              status === "archived" ? new Date() : status === "active" ? null : current.archivedAt,
          },
        });

        if (Array.isArray(days)) await replaceDays(tx, id, days);
        return tx.workout.findUnique({ where: { id }, include: includeWorkout });
      });

      return res.status(200).json({ ok: true, workout });
    } catch (err) {
      console.error("PUT /api/workouts/[id]:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const workout = await prisma.workout.findUnique({ where: { id } });
      if (!workout) return res.status(404).json({ ok: false, error: "Scheda non trovata" });
      await prisma.workout.update({
        where: { id },
        data: { status: "archived", archivedAt: new Date() },
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/workouts/[id]:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "PUT", "DELETE"]);
}
