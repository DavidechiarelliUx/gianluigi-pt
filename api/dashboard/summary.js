import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { methodNotAllowed } from "../../server/lib/body.js";

export default async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [clients, activeWorkouts, sessionsWeek] = await Promise.all([
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.workout.count({ where: { status: "active", client: { is: { deletedAt: null } } } }),
      prisma.workoutSession.count({
        where: { status: "completed", date: { gte: sevenDaysAgo }, client: { is: { deletedAt: null } } },
      }),
    ]);
    return res.status(200).json({ ok: true, summary: { clients, activeWorkouts, sessionsWeek } });
  } catch (err) {
    console.error("GET /api/dashboard/summary:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}
