import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../../server/lib/body.js";

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
  return {
    paymentStatus: activeSubscription ? "active" : latestOrder?.status || "none",
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
            include: {
              _count: { select: { days: true, sessions: true } },
              days: {
                orderBy: { order: "asc" },
                include: {
                  items: {
                    orderBy: { order: "asc" },
                    include: { exercise: { select: { name: true, muscleGroup: true } } },
                  },
                },
              },
            },
          },
          _count: { select: { workoutSessions: true } },
        },
      });
      if (!client) return res.status(404).json({ ok: false, error: "Cliente non trovato" });
      const [
        orders,
        subscriptions,
        sessions,
        metrics,
        messages,
        bookings,
        liveMovements,
        liveBalance,
      ] = await Promise.all([
        prisma.order.findMany({
          where: { userId: client.userId },
          orderBy: { createdAt: "desc" },
          include: { product: { select: { name: true, type: true, billingInterval: true, sessionsQty: true } } },
        }),
        prisma.subscription.findMany({
          where: { userId: client.userId },
          orderBy: { updatedAt: "desc" },
          include: { product: { select: { name: true, accessLevel: true, billingInterval: true } } },
        }).catch(() => []),
        prisma.workoutSession.findMany({
          where: { clientId: client.id },
          orderBy: { date: "desc" },
          take: 12,
          include: {
            workout: { select: { id: true, title: true } },
            itemLogs: { select: { completed: true, loadUsed: true, repsDone: true, perceivedDifficulty: true } },
          },
        }),
        prisma.clientMetric.findMany({
          where: { clientId: client.id },
          orderBy: { date: "desc" },
          take: 12,
        }),
        prisma.coachMessage.findMany({
          where: { clientId: client.id, hiddenAt: null },
          orderBy: { createdAt: "asc" },
          take: 80,
        }),
        prisma.booking.findMany({
          where: { clientId: client.id },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: { liveSession: { select: { title: true, type: true, status: true, scheduledAt: true, durationMin: true } } },
        }),
        prisma.liveCreditLedger.findMany({
          where: { clientId: client.id },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.liveCreditLedger.aggregate({
          where: { clientId: client.id },
          _sum: { amount: true },
        }),
      ]);

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
          orders: orders.filter((order) => order.status !== "pending"),
          subscriptions,
          sessions,
          metrics,
          messages,
          bookings,
          liveMovements,
          dashboard: {
            ...paymentSummary(orders, subscriptions),
            liveCredits: liveBalance._sum.amount || 0,
            openRequests: messages.filter((message) => message.senderRole === "client" && message.status !== "resolved").length,
            activeWorkouts: client.workouts.filter((workout) => workout.status === "active").length,
            totalWorkouts: client.workouts.length,
            totalSessions: client._count?.workoutSessions || 0,
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
