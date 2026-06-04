import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { methodNotAllowed } from "../../server/lib/body.js";
import { EXERCISE_CATALOG, EXERCISE_SLUG_BY_NAME } from "../../server/lib/exercise-catalog.js";

/**
 * GET /api/exercises → lista esercizi del catalogo (ordinati per nome)
 * Solo admin per ora (usato nell'editor schede).
 */
export default async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

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
    const exercises = await prisma.exercise.findMany({
      orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
    });
    return res.status(200).json({
      ok: true,
      exercises: exercises.map((exercise) => ({
        ...exercise,
        illustration: EXERCISE_SLUG_BY_NAME.get(exercise.name) || exercise.defaultNotes || null,
      })),
    });
  } catch (err) {
    console.error("GET /api/exercises:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}
