import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { methodNotAllowed, parseJsonBody } from "../../server/lib/body.js";
import { EXERCISE_CATALOG, EXERCISE_SLUG_BY_NAME } from "../../server/lib/exercise-catalog.js";
import { sendRenewalReminderEmail } from "../../server/lib/mailer.js";

// ─── GET /api/admin/summary ───────────────────────────────────────────────────

async function summary(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      clients,
      activeWorkouts,
      sessionsWeek,
      liveBookingsWeek,
      revenueMonth,
      clientsWithoutWorkout,
    ] = await Promise.all([
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.workout.count({ where: { status: "active", client: { is: { deletedAt: null } } } }),
      prisma.workoutSession.count({
        where: {
          status: "completed",
          date: { gte: sevenDaysAgo },
          client: { is: { deletedAt: null } },
        },
      }),
      prisma.booking.count({
        where: {
          status: "confirmed",
          createdAt: { gte: sevenDaysAgo },
          liveSession: { status: { in: ["scheduled", "live", "completed"] } },
        },
      }),
      prisma.order.aggregate({
        where: { status: "paid", createdAt: { gte: startOfMonth } },
        _sum: { amountCents: true },
      }),
      prisma.client.count({
        where: { deletedAt: null, workouts: { none: { status: "active" } } },
      }),
    ]);

    // Subscription counts — graceful fallback se tabella non esiste ancora
    let subscriptionsActive = 0;
    let subscriptionsExpiring7d = 0;
    try {
      [subscriptionsActive, subscriptionsExpiring7d] = await Promise.all([
        prisma.subscription.count({ where: { status: { in: ["active", "trialing"] } } }),
        prisma.subscription.count({
          where: {
            status: { in: ["active", "trialing"] },
            currentPeriodEnd: { gte: now, lte: sevenDaysFromNow },
          },
        }),
      ]);
    } catch { /* subscription table not yet migrated */ }

    return res.status(200).json({
      ok: true,
      summary: {
        clients,
        activeWorkouts,
        sessionsWeek,
        liveBookingsWeek,
        revenueMonthCents: revenueMonth._sum.amountCents || 0,
        clientsWithoutWorkout,
        subscriptionsActive,
        subscriptionsExpiring7d,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/summary:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── GET /api/admin/exercises ─────────────────────────────────────────────────

async function exercises(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    await Promise.all(
      EXERCISE_CATALOG.map((exercise) =>
        prisma.exercise.upsert({
          where: { name: exercise.name },
          update: { muscleGroup: exercise.muscleGroup },
          create: { name: exercise.name, muscleGroup: exercise.muscleGroup, defaultNotes: exercise.slug },
        })
      )
    );
    const list = await prisma.exercise.findMany({ orderBy: [{ muscleGroup: "asc" }, { name: "asc" }] });
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

// ─── GET /api/admin/messages ──────────────────────────────────────────────────

async function messages(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const list = await prisma.coachMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { client: { include: { user: { select: { fullName: true, email: true } } } } },
    });
    return res.status(200).json({ ok: true, messages: list });
  } catch (err) {
    console.error("GET /api/admin/messages:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── GET /api/admin/subscription-expiring ────────────────────────────────────

async function subscriptionExpiring(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    let subscriptions = [];
    try {
      subscriptions = await prisma.subscription.findMany({
        where: { status: { in: ["active", "trialing", "past_due"] } },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              client: { select: { id: true, phone: true } },
            },
          },
          product: { select: { name: true, accessLevel: true, billingInterval: true } },
        },
        orderBy: { currentPeriodEnd: "asc" },
      });
    } catch {
      // Subscription table not yet migrated — return empty array
    }

    return res.status(200).json({ ok: true, subscriptions });
  } catch (err) {
    console.error("GET /api/admin/subscription-expiring:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── POST /api/admin/send-renewal-reminder ────────────────────────────────────

async function sendRenewalReminder(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const body = parseJsonBody(req);
  const { userId, subscriptionId } = body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId obbligatorio" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });
    if (!user?.email) return res.status(404).json({ ok: false, error: "Utente non trovato" });

    let productName = "il tuo abbonamento";
    let expiresAt = null;
    let cancelAtPeriodEnd = false;

    if (subscriptionId) {
      try {
        const sub = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
          include: { product: { select: { name: true } } },
        });
        if (sub) {
          productName = sub.product?.name || productName;
          expiresAt = sub.currentPeriodEnd;
          cancelAtPeriodEnd = sub.cancelAtPeriodEnd;
        }
      } catch { /* ignore */ }
    }

    await sendRenewalReminderEmail({ to: user.email, fullName: user.fullName, productName, expiresAt, cancelAtPeriodEnd });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/send-renewal-reminder:", err);
    if (err.code === "EMAIL_NOT_CONFIGURED") {
      return res.status(503).json({ ok: false, error: "Email non configurata — aggiungi le credenziali SMTP in Vercel." });
    }
    return res.status(500).json({ ok: false, error: "Errore invio email" });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const { action } = req.query;
  if (action === "summary")                return summary(req, res);
  if (action === "exercises")              return exercises(req, res);
  if (action === "messages")              return messages(req, res);
  if (action === "subscription-expiring") return subscriptionExpiring(req, res);
  if (action === "send-renewal-reminder") return sendRenewalReminder(req, res);
  return res.status(404).json({ ok: false, error: "Endpoint admin non trovato" });
}
