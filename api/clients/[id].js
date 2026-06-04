import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";

/**
 * GET    /api/clients/:id  → dettaglio cliente
 * PUT    /api/clients/:id  → modifica (phone, goal, notes, fullName)
 * DELETE /api/clients/:id  → soft delete (GDPR: deletedAt = now)
 */
export default async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const { id } = req.query;

  /* ---- GET ---- */
  if (req.method === "GET") {
    try {
      const client = await prisma.client.findFirst({
        where: { id, deletedAt: null },
        include: {
          user: { select: { id: true, email: true, fullName: true, createdAt: true, inviteToken: true, passwordHash: true } },
          workouts: {
            orderBy: { createdAt: "desc" },
            include: { _count: { select: { days: true } } },
          },
          _count: { select: { workoutSessions: true } },
        },
      });
      if (!client) return res.status(404).json({ ok: false, error: "Cliente non trovato" });
      return res.status(200).json({
        ok: true,
        client: {
          ...client,
          user: {
            id: client.user.id,
            email: client.user.email,
            fullName: client.user.fullName,
            createdAt: client.user.createdAt,
            inviteToken: client.user.inviteToken,
            hasPassword: !!client.user.passwordHash,
          },
        },
      });
    } catch (err) {
      console.error("GET /api/clients/[id]:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  /* ---- PUT ---- */
  if (req.method === "PUT") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });
    const { fullName, phone, goal, notes } = body || {};

    try {
      const client = await prisma.client.findFirst({ where: { id, deletedAt: null } });
      if (!client) return res.status(404).json({ ok: false, error: "Cliente non trovato" });

      const updates = [
        ...(fullName?.trim()
          ? [prisma.user.update({ where: { id: client.userId }, data: { fullName: fullName.trim() } })]
          : []),
        prisma.client.update({
          where: { id },
          data: {
            phone: phone?.trim() ?? undefined,
            goal: goal?.trim() ?? undefined,
            notes: notes?.trim() ?? undefined,
          },
        }),
      ];
      const result = await prisma.$transaction(updates);
      const updatedClient = result.at(-1);

      return res.status(200).json({ ok: true, client: updatedClient });
    } catch (err) {
      console.error("PUT /api/clients/[id]:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  /* ---- DELETE (soft) ---- */
  if (req.method === "DELETE") {
    try {
      const client = await prisma.client.findFirst({ where: { id, deletedAt: null } });
      if (!client) return res.status(404).json({ ok: false, error: "Cliente non trovato" });

      await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/clients/[id]:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "PUT", "DELETE"]);
}
