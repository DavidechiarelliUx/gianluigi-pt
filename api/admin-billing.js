import { prisma } from "../server/lib/prisma.js";
import { requireAdmin } from "../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../server/lib/body.js";

const ACCESS_LEVELS = ["none", "app", "live", "app_live", "premium"];
const SUB_STATUSES = ["active", "trialing", "past_due", "unpaid", "canceled", "incomplete"];
const ORDER_STATUSES = ["pending", "paid", "failed", "refunded"];

/**
 * Gestione abbonamenti/pagamenti (solo admin).
 * GET  /api/admin-billing                → { subscriptions, orders }
 * POST /api/admin-billing  body:
 *   { type:"subscription", id, status?, accessLevel?, currentPeriodEnd?, cancelAtPeriodEnd? }
 *   { type:"order", id, status? }
 * Permette a Gianluigi di correggere manualmente un abbonamento/ordine se Stripe va in errore.
 */
export default async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "GET") return list(res);
  if (req.method === "POST") return update(req, res);
  return methodNotAllowed(res, ["GET", "POST"]);
}

async function list(res) {
  try {
    let subscriptions = [];
    try {
      subscriptions = await prisma.subscription.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          product: { select: { name: true } },
        },
      });
    } catch {
      /* tabella non ancora migrata */
    }

    const orders = await prisma.order.findMany({
      where: { status: { in: ["paid", "refunded", "pending", "failed"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        product: { select: { name: true, type: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.status(200).json({ ok: true, subscriptions, orders });
  } catch (err) {
    console.error("GET /api/admin-billing:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

async function update(req, res) {
  const body = parseJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });
  const { type, id } = body;
  if (!id) return res.status(400).json({ ok: false, error: "id mancante" });

  try {
    if (type === "subscription") {
      const data = {};
      if (body.status !== undefined) {
        if (!SUB_STATUSES.includes(body.status))
          return res.status(400).json({ ok: false, error: "Stato abbonamento non valido" });
        data.status = body.status;
      }
      if (body.accessLevel !== undefined) {
        if (!ACCESS_LEVELS.includes(body.accessLevel))
          return res.status(400).json({ ok: false, error: "Livello di accesso non valido" });
        data.accessLevel = body.accessLevel;
      }
      if (body.cancelAtPeriodEnd !== undefined) data.cancelAtPeriodEnd = !!body.cancelAtPeriodEnd;
      if (body.currentPeriodEnd !== undefined)
        data.currentPeriodEnd = body.currentPeriodEnd ? new Date(body.currentPeriodEnd) : null;

      const updated = await prisma.subscription.update({ where: { id }, data });
      return res.status(200).json({ ok: true, subscription: updated });
    }

    if (type === "order") {
      if (!ORDER_STATUSES.includes(body.status))
        return res.status(400).json({ ok: false, error: "Stato ordine non valido" });
      const updated = await prisma.order.update({ where: { id }, data: { status: body.status } });
      return res.status(200).json({ ok: true, order: updated });
    }

    return res.status(400).json({ ok: false, error: "type non valido (subscription|order)" });
  } catch (err) {
    console.error("POST /api/admin-billing:", err);
    if (err.code === "P2025") return res.status(404).json({ ok: false, error: "Record non trovato" });
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}
