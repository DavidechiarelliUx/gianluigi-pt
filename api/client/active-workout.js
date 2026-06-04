import { prisma } from "../../server/lib/prisma.js";
import { requireAuth } from "../../server/lib/guards.js";
import { methodNotAllowed } from "../../server/lib/body.js";

export default async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  if (auth.role !== "client" || !auth.clientId) {
    return res.status(403).json({ ok: false, error: "Area riservata ai clienti" });
  }
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

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
