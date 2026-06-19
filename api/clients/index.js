import crypto from "crypto";
import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";
import { sendClientInviteEmail } from "../../server/lib/mailer.js";

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function pushMap(map, key, value) {
  if (!key) return;
  const list = map.get(key) || [];
  list.push(value);
  map.set(key, list);
}

function paymentSummary(orders = [], subscriptions = []) {
  const visibleOrders = orders.filter((order) => order.status !== "pending");
  const paidOrders = orders.filter((order) => order.status === "paid");
  const activeSubscription = subscriptions.find((sub) => ["active", "trialing"].includes(sub.status));
  const currentSubscription =
    activeSubscription ||
    subscriptions.find((sub) => ["past_due", "canceled"].includes(sub.status)) ||
    subscriptions[0] ||
    null;
  const latestOrder = visibleOrders[0] || null;
  const totalPaidCents = paidOrders.reduce((sum, order) => sum + (Number(order.amountCents) || 0), 0);
  const paymentStatus = activeSubscription ? "active" : latestOrder?.status || "none";

  return {
    paymentStatus,
    totalPaidCents,
    paidOrdersCount: paidOrders.length,
    latestOrder,
    activeSubscription: activeSubscription || null,
    subscriptionStatus: currentSubscription?.status || null,
    subscriptionProductName: currentSubscription?.product?.name || null,
    subscriptionExpiresAt: currentSubscription?.currentPeriodEnd || null,
    subscriptionRenewsAt: currentSubscription?.cancelAtPeriodEnd ? null : currentSubscription?.currentPeriodEnd || null,
    subscriptionCancelAtPeriodEnd: !!currentSubscription?.cancelAtPeriodEnd,
  };
}

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
      const userIds = clients.map((client) => client.userId);
      const clientIds = clients.map((client) => client.id);
      const [
        orders,
        subscriptions,
        liveBalances,
        openMessages,
        activeWorkouts,
      ] = clientIds.length ? await Promise.all([
        prisma.order.findMany({
          where: { userId: { in: userIds } },
          orderBy: { createdAt: "desc" },
          include: { product: { select: { name: true, type: true, billingInterval: true, sessionsQty: true } } },
        }),
        prisma.subscription.findMany({
          where: { userId: { in: userIds } },
          orderBy: { updatedAt: "desc" },
          include: { product: { select: { name: true, accessLevel: true, billingInterval: true } } },
        }).catch(() => []),
        prisma.liveCreditLedger.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds } },
          _sum: { amount: true },
        }),
        prisma.coachMessage.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds }, hiddenAt: null, senderRole: "client", status: { not: "resolved" } },
          _count: { _all: true },
        }),
        prisma.workout.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds }, status: "active" },
          _count: { _all: true },
        }),
      ]) : [[], [], [], [], []];

      const ordersByUser = new Map();
      const subscriptionsByUser = new Map();
      for (const order of orders) pushMap(ordersByUser, order.userId, order);
      for (const subscription of subscriptions) pushMap(subscriptionsByUser, subscription.userId, subscription);
      const liveBalanceMap = new Map(liveBalances.map((row) => [row.clientId, row._sum.amount || 0]));
      const openMessageMap = new Map(openMessages.map((row) => [row.clientId, row._count._all || 0]));
      const activeWorkoutMap = new Map(activeWorkouts.map((row) => [row.clientId, row._count._all || 0]));

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
          accessDisabledAt: client.accessDisabledAt,
          accessDisabledReason: client.accessDisabledReason,
          dashboard: {
            ...paymentSummary(ordersByUser.get(client.userId) || [], subscriptionsByUser.get(client.userId) || []),
            liveCredits: liveBalanceMap.get(client.id) || 0,
            openRequests: openMessageMap.get(client.id) || 0,
            activeWorkouts: activeWorkoutMap.get(client.id) || 0,
            totalWorkouts: client._count?.workouts || 0,
            totalSessions: client._count?.workoutSessions || 0,
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

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: email.trim().toLowerCase(),
            fullName: fullName.trim(),
            role: "client",
            inviteToken: token,
            inviteExpires: expires,
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

      let inviteEmailSent = false;
      let inviteEmailError = null;
      try {
        await sendClientInviteEmail({
          to: result.user.email,
          fullName: result.user.fullName,
          token,
          context: "manual",
        });
        inviteEmailSent = true;
      } catch (err) {
        inviteEmailError = err.code || err.message || "EMAIL_FAILED";
        console.warn("POST /api/clients: invito email non inviato", inviteEmailError);
      }

      return res.status(201).json({
        ok: true,
        client: result.client,
        user: result.user,
        inviteEmailSent,
        inviteEmailError,
      });
    } catch (err) {
      console.error("POST /api/clients:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
