import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * GET  /api/clients        → lista clienti (con user + conteggio schede)
 * POST /api/clients        → crea cliente (User + Client in transazione)
 */
export default async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  /* ---- GET ---- */
  if (req.method === "GET") {
    try {
      const clients = await prisma.client.findMany({
        where: { deletedAt: null },
        include: {
          user: { select: { id: true, email: true, fullName: true, inviteToken: true, passwordHash: true, createdAt: true } },
          _count: { select: { workouts: true, workoutSessions: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({
        ok: true,
        clients: clients.map((client) => ({
          ...client,
          user: {
            id: client.user.id,
            email: client.user.email,
            fullName: client.user.fullName,
            inviteToken: client.user.inviteToken,
            createdAt: client.user.createdAt,
            hasPassword: !!client.user.passwordHash,
          },
        })),
      });
    } catch (err) {
      console.error("GET /api/clients:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  /* ---- POST ---- */
  if (req.method === "POST") {
    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });
    const { email, fullName, phone, goal, notes } = body || {};
    if (!isEmail(email) || !fullName?.trim()) {
      return res.status(400).json({ ok: false, error: "Email e nome completo sono obbligatori" });
    }

    try {
      // Controlla se l'email esiste già
      const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existing) return res.status(409).json({ ok: false, error: "Email già registrata" });

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: email.trim().toLowerCase(),
            fullName: fullName.trim(),
            role: "client",
            // passwordHash null: il cliente la imposterà via invito
          },
        });
        const client = await tx.client.create({
          data: {
            userId: user.id,
            phone: phone?.trim() || null,
            goal: goal?.trim() || null,
            notes: notes?.trim() || null,
          },
        });
        return { user, client };
      });

      return res.status(201).json({ ok: true, client: result.client, user: result.user });
    } catch (err) {
      console.error("POST /api/clients:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
