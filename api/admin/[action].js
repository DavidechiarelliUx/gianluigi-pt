import { prisma } from "../../server/lib/prisma.js";
import { requireAdmin } from "../../server/lib/guards.js";
import { methodNotAllowed, parseJsonBody } from "../../server/lib/body.js";
import { EXERCISE_CATALOG, EXERCISE_SLUG_BY_NAME } from "../../server/lib/exercise-catalog.js";
import { sendRenewalReminderEmail } from "../../server/lib/mailer.js";

const PRODUCT_TYPES = ["session_solo", "session_group", "package"];
const ACCESS_LEVELS = ["none", "app", "live", "app_live", "premium"];
const BILLING_INTERVALS = ["one_time", "month", "year"];

function clampInt(value, min, max, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function normalizeFeatures(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value.split("\n").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeDiscountTiers(value) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((tier) => ({
      minQty: clampInt(tier.minQty, 1, 100, 1),
      discountPercent: clampInt(tier.discountPercent, 0, 90, 0),
    }))
    .filter((tier) => tier.discountPercent > 0)
    .sort((a, b) => a.minQty - b.minQty);
}

function publicProduct(product) {
  return {
    ...product,
    features: Array.isArray(product.features) ? product.features : [],
    discountTiers: Array.isArray(product.discountTiers) ? product.discountTiers : [],
  };
}

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
      openMessages,
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
      prisma.coachMessage.count({
        where: { hiddenAt: null, senderRole: "client", status: { not: "resolved" } },
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
        openMessages,
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
  if (req.method === "GET") {
    const includeResolved = req.query.includeResolved === "1" || req.query.includeResolved === "true";
    const clientId = typeof req.query.clientId === "string" ? req.query.clientId : "";
    const limit = clampInt(req.query.limit, 1, 100, clientId ? 50 : 12);

    try {
      const list = await prisma.coachMessage.findMany({
        where: {
          hiddenAt: null,
          senderRole: "client",
          ...(includeResolved ? {} : { status: { not: "resolved" } }),
          ...(clientId ? { clientId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          client: {
            include: {
              user: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      });
      return res.status(200).json({ ok: true, messages: list });
    } catch (err) {
      console.error("GET /api/admin/messages:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "POST") {
    const body = parseJsonBody(req);
    const clientId = String(body?.clientId || "").trim();
    const message = String(body?.message || "").trim();
    const subject = String(body?.subject || "Messaggio dal trainer").trim() || "Messaggio dal trainer";
    if (!clientId || message.length < 2) {
      return res.status(400).json({ ok: false, error: "Cliente e messaggio sono obbligatori" });
    }

    try {
      const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } });
      if (!client) return res.status(404).json({ ok: false, error: "Cliente non trovato" });
      const created = await prisma.coachMessage.create({
        data: {
          clientId,
          subject,
          message,
          senderRole: "admin",
          status: "sent",
        },
      });
      return res.status(201).json({ ok: true, message: created });
    } catch (err) {
      console.error("POST /api/admin/messages:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    const body = parseJsonBody(req);
    const id = String(body?.id || req.query.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "id messaggio obbligatorio" });

    const data = {};
    if (body?.status !== undefined) {
      const status = String(body.status || "").trim();
      if (!["open", "resolved"].includes(status)) {
        return res.status(400).json({ ok: false, error: "Stato messaggio non valido" });
      }
      data.status = status;
      data.resolvedAt = status === "resolved" ? new Date() : null;
    }
    if (body?.hidden !== undefined) data.hiddenAt = body.hidden ? new Date() : null;
    if (body?.read !== undefined && body.read) data.readAt = new Date();

    try {
      const updated = await prisma.coachMessage.update({
        where: { id },
        data,
        include: { client: { include: { user: { select: { id: true, fullName: true, email: true } } } } },
      });
      return res.status(200).json({ ok: true, message: updated });
    } catch (err) {
      console.error("PATCH /api/admin/messages:", err);
      if (err.code === "P2025") return res.status(404).json({ ok: false, error: "Messaggio non trovato" });
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST", "PATCH", "PUT"]);
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

// ─── GET|PUT /api/admin/products ─────────────────────────────────────────────

async function products(req, res) {
  if (req.method === "GET") {
    try {
      const list = await prisma.product.findMany({
        orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
      });
      return res.status(200).json({ ok: true, products: list.map(publicProduct) });
    } catch (err) {
      console.error("GET /api/admin/products:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "PUT") {
    const body = parseJsonBody(req);
    if (!body?.id) return res.status(400).json({ ok: false, error: "id prodotto obbligatorio" });

    const data = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) return res.status(400).json({ ok: false, error: "Nome prodotto non valido" });
      data.name = name;
    }
    if (body.description !== undefined) data.description = String(body.description || "").trim() || null;
    if (body.priceCents !== undefined) data.priceCents = clampInt(body.priceCents, 100, 1000000, 100);
    if (body.currency !== undefined) data.currency = String(body.currency || "eur").trim().toLowerCase();
    if (body.type !== undefined) {
      if (!PRODUCT_TYPES.includes(body.type)) return res.status(400).json({ ok: false, error: "Tipo prodotto non valido" });
      data.type = body.type;
    }
    if (body.sessionsQty !== undefined) data.sessionsQty = clampInt(body.sessionsQty, 0, 100, 0);
    if (body.discountPercent !== undefined) data.discountPercent = clampInt(body.discountPercent, 0, 90, 0);
    if (body.discountTiers !== undefined) data.discountTiers = normalizeDiscountTiers(body.discountTiers);
    if (body.features !== undefined) data.features = normalizeFeatures(body.features);
    if (body.badgeLabel !== undefined) data.badgeLabel = String(body.badgeLabel || "").trim() || null;
    if (body.sortOrder !== undefined) data.sortOrder = clampInt(body.sortOrder, 0, 1000, 0);
    if (body.active !== undefined) data.active = !!body.active;
    if (body.accessLevel !== undefined) {
      if (!ACCESS_LEVELS.includes(body.accessLevel)) return res.status(400).json({ ok: false, error: "Accesso non valido" });
      data.accessLevel = body.accessLevel;
    }
    if (body.billingInterval !== undefined) {
      if (!BILLING_INTERVALS.includes(body.billingInterval)) return res.status(400).json({ ok: false, error: "Intervallo non valido" });
      data.billingInterval = body.billingInterval;
    }

    try {
      const product = await prisma.product.update({
        where: { id: body.id },
        data,
      });
      return res.status(200).json({ ok: true, product: publicProduct(product) });
    } catch (err) {
      console.error("PUT /api/admin/products:", err);
      if (err.code === "P2025") return res.status(404).json({ ok: false, error: "Prodotto non trovato" });
      if (err.code === "P2002") return res.status(409).json({ ok: false, error: "Nome prodotto già esistente" });
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "PUT"]);
}

// ─── GET|POST /api/admin/live-credits ────────────────────────────────────────

async function liveCredits(req, res) {
  if (req.method === "GET") {
    try {
      const [clients, balances] = await Promise.all([
        prisma.client.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, fullName: true, email: true } } },
        }),
        prisma.liveCreditLedger.groupBy({
          by: ["clientId"],
          _sum: { amount: true },
        }),
      ]);
      const balanceMap = new Map(balances.map((row) => [row.clientId, row._sum.amount || 0]));
      return res.status(200).json({
        ok: true,
        clients: clients.map((client) => ({ ...client, liveCredits: balanceMap.get(client.id) || 0 })),
      });
    } catch (err) {
      console.error("GET /api/admin/live-credits:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  if (req.method === "POST") {
    const body = parseJsonBody(req);
    const clientId = String(body?.clientId || "");
    const amount = clampInt(body?.amount, 1, 100, 1);
    const note = String(body?.note || "").trim() || "Credito aggiunto da dashboard";
    if (!clientId) return res.status(400).json({ ok: false, error: "Cliente obbligatorio" });

    try {
      const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } });
      if (!client) return res.status(404).json({ ok: false, error: "Cliente non trovato" });
      const movement = await prisma.liveCreditLedger.create({
        data: {
          clientId,
          amount,
          reason: "admin_grant",
          note,
        },
      });
      return res.status(201).json({ ok: true, movement });
    } catch (err) {
      console.error("POST /api/admin/live-credits:", err);
      return res.status(500).json({ ok: false, error: "Errore interno" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
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
  if (action === "products")              return products(req, res);
  if (action === "live-credits")          return liveCredits(req, res);
  return res.status(404).json({ ok: false, error: "Endpoint admin non trovato" });
}
