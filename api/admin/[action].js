import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { methodNotAllowed } from "../../server/lib/body.js";
import { EXERCISE_CATALOG, EXERCISE_SLUG_BY_NAME } from "../../server/lib/exercise-catalog.js";

/** GET /api/admin/summary — contatori panoramica dashboard. */
async function summary(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [clients, activeWorkouts, sessionsWeek] = await Promise.all([
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.workout.count({ where: { status: "active", client: { is: { deletedAt: null } } } }),
      prisma.workoutSession.count({
        where: {
          status: "completed",
          date: { gte: sevenDaysAgo },
          client: { is: { deletedAt: null } },
        },
      }),
    ]);
    return res.status(200).json({ ok: true, summary: { clients, activeWorkouts, sessionsWeek } });
  } catch (err) {
    console.error("GET /api/admin/summary:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

/** GET /api/admin/exercises — catalogo esercizi (upsert + ritorna lista con slug illustrazione). */
async function exercises(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    await Promise.all(
      EXERCISE_CATALOG.map((exercise) =>
        prisma.exercise.upsert({
          where: { name: exercise.name },
          update: { muscleGroup: exercise.muscleGroup },
          create: {
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            defaultNotes: exercise.slug,
          },
        })
      )
    );
    const list = await prisma.exercise.findMany({
      orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
    });
    return res.status(200).json({
      ok: true,
      exercises: list.map((ex) => ({
        ...ex,
        illustration: EXERCISE_SLUG_BY_NAME.get(ex.name) || ex.defaultNotes || null,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/exercises:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

export default function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const { action } = req.query;
  if (action === "summary") return summary(req, res);
  if (action === "exercises") return exercises(req, res);
  return res.status(404).json({ ok: false, error: "Endpoint admin non trovato" });
}
