import crypto from "crypto";
import Stripe from "stripe";
import { prisma } from "../../server/lib/prisma.js";
import { requireAuth } from "../../server/lib/guards.js";
import { methodNotAllowed, parseJsonBody } from "../../server/lib/body.js";
import { appUrl, sendClientInviteEmail, sendExistingClientPaymentEmail } from "../../server/lib/mailer.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

// ─── Prodotti default ─────────────────────────────────────────────────────────

const DEFAULT_PRODUCTS = [
  {
    name: "Start Check",
    description: "Analisi obiettivo e consiglio personalizzato per capire da dove partire.",
    priceCents: 1700,
    type: "package",
    sessionsQty: 0,
    accessLevel: "app",
    billingInterval: "one_time",
  },
  {
    name: "App Starter",
    description: "Scheda 7 giorni, accesso app e tracking base per provare il metodo.",
    priceCents: 2900,
    type: "package",
    sessionsQty: 0,
    accessLevel: "app",
    billingInterval: "one_time",
  },
  {
    name: "App Mensile",
    description: "Scheda mensile, app, tracking e aggiornamento manuale della scheda.",
    priceCents: 5900,
    type: "package",
    sessionsQty: 0,
    accessLevel: "app",
    billingInterval: "month",
  },
  {
    name: "App + Live",
    description: "App Mensile con live di gruppo settimanale inclusa.",
    priceCents: 9700,
    type: "package",
    sessionsQty: 4,
    accessLevel: "app_live",
    billingInterval: "month",
  },
  {
    name: "Premium 1:1",
    description: "App, scheda, feedback e sessione individuale 1:1.",
    priceCents: 14900,
    type: "package",
    sessionsQty: 1,
    accessLevel: "premium",
    billingInterval: "month",
  },
];

const LAUNCH_CAPACITY = {
  "App Mensile": 12,
  "App + Live": 8,
  "Premium 1:1": 4,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    const err = new Error("Stripe non configurato");
    err.code = "STRIPE_NOT_CONFIGURED";
    throw err;
  }
  return new Stripe(key);
}

function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function publicProduct(product, paidQuantity = 0) {
  const launchCapacity = LAUNCH_CAPACITY[product.name] || null;
  const remainingSeats = launchCapacity == null
    ? null
    : Math.max(0, launchCapacity - paidQuantity);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    currency: product.currency,
    type: product.type,
    sessionsQty: product.sessionsQty,
    accessLevel: product.accessLevel || "app",
    billingInterval: product.billingInterval || "one_time",
    isSubscription: (product.billingInterval || "one_time") !== "one_time",
    launchCapacity,
    remainingSeats,
  };
}

async function ensureDefaultProducts() {
  for (const item of DEFAULT_PRODUCTS) {
    await prisma.product.upsert({
      where: { name: item.name },
      update: { ...item, currency: "eur", active: true },
      create: { ...item, currency: "eur", active: true },
    });
  }
  await prisma.product.updateMany({
    where: { name: { notIn: DEFAULT_PRODUCTS.map((p) => p.name) } },
    data: { active: false },
  });
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (typeof req.rawBody === "string") return Buffer.from(req.rawBody);
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (req.body && typeof req.body === "object") return Buffer.from(JSON.stringify(req.body));
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(req) {
  if (req.body) return parseJsonBody(req);
  try { return JSON.parse((await readRawBody(req)).toString("utf8")); } catch { return null; }
}

async function createInviteForUser(tx, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await tx.user.update({ where: { id: userId }, data: { inviteToken: token, inviteExpires: expires } });
  return token;
}

async function ensureClientFromPaidOrder(order) {
  const email = order.customerEmail.trim().toLowerCase();
  const fullName = order.customerName.trim() || email.split("@")[0];

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email }, include: { client: true } });

    if (!user) {
      user = await tx.user.create({
        data: { email, fullName, role: "client" },
        include: { client: true },
      });
    } else if (user.role !== "client") {
      user = await tx.user.update({
        where: { id: user.id },
        data: { role: "client", fullName: user.fullName || fullName },
        include: { client: true },
      });
    }

    let client = user.client;
    if (!client) {
      client = await tx.client.create({
        data: {
          userId: user.id,
          phone: order.customerPhone || null,
          goal: order.product?.name || "Percorso online",
          notes: `Creato automaticamente dopo pagamento Stripe: ${order.product?.name || "ordine"}`,
        },
      });
    } else if (client.deletedAt) {
      client = await tx.client.update({
        where: { id: client.id },
        data: { deletedAt: null, phone: client.phone || order.customerPhone || null },
      });
    }

    let inviteToken = null;
    if (!user.passwordHash) {
      inviteToken = await createInviteForUser(tx, user.id);
    }

    await tx.order.update({ where: { id: order.id }, data: { userId: user.id, status: "paid" } });

    return { user: { ...user, client }, client, inviteToken };
  });
}

// ─── Gestione Stripe Subscription nel DB ─────────────────────────────────────

/** Crea o aggiorna un record Subscription dal payload Stripe. */
async function upsertSubscription(stripeSub, userId, productId, accessLevel) {
  const level = accessLevel || "app";
  try {
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: stripeSub.id },
      update: {
        status: stripeSub.status,
        stripePriceId: stripeSub.items?.data?.[0]?.price?.id || null,
        stripeCustomerId: typeof stripeSub.customer === "string" ? stripeSub.customer : null,
        accessLevel: level,
        currentPeriodStart: stripeSub.current_period_start
          ? new Date(stripeSub.current_period_start * 1000)
          : null,
        currentPeriodEnd: stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: !!stripeSub.cancel_at_period_end,
        updatedAt: new Date(),
      },
      create: {
        userId,
        productId: productId || null,
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: stripeSub.items?.data?.[0]?.price?.id || null,
        stripeCustomerId: typeof stripeSub.customer === "string" ? stripeSub.customer : null,
        status: stripeSub.status,
        accessLevel: level,
        currentPeriodStart: stripeSub.current_period_start
          ? new Date(stripeSub.current_period_start * 1000)
          : null,
        currentPeriodEnd: stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: !!stripeSub.cancel_at_period_end,
      },
    });
  } catch (err) {
    // Se la tabella non esiste ancora (pre-migration), logga e vai avanti
    console.warn("upsertSubscription: impossibile salvare (tabella mancante?)", err.message);
  }
}

// ─── GET /api/payments/products ───────────────────────────────────────────────

async function products(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    await ensureDefaultProducts();
    const list = await prisma.product.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { priceCents: "asc" }],
    });
    const paidByProduct = await prisma.order.groupBy({
      by: ["productId"],
      where: { status: "paid", productId: { in: list.map((p) => p.id) } },
      _sum: { quantity: true },
    });
    const paidQtyMap = new Map(paidByProduct.map((row) => [row.productId, row._sum.quantity || 0]));
    return res.status(200).json({
      ok: true,
      products: list.map((p) => publicProduct(p, paidQtyMap.get(p.id) || 0)),
    });
  } catch (err) {
    console.error("GET /api/payments/products:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── POST /api/payments/checkout ─────────────────────────────────────────────

async function checkout(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const body = await readJsonBody(req);
  if (!body) return res.status(400).json({ ok: false, error: "Body non valido" });

  const productId = String(body.productId || "");
  const customerEmail = String(body.email || "").trim().toLowerCase();
  const customerName = String(body.fullName || "").trim();
  const customerPhone = body.phone ? String(body.phone).trim() : null;
  const requestedQty = Math.max(1, Math.min(20, Number(body.quantity) || 1));

  if (!productId || !isEmail(customerEmail) || customerName.length < 2) {
    return res.status(400).json({ ok: false, error: "Prodotto, nome ed email sono obbligatori" });
  }

  try {
    const stripe = stripeClient();
    const product = await prisma.product.findFirst({ where: { id: productId, active: true } });
    if (!product) return res.status(404).json({ ok: false, error: "Prodotto non trovato" });

    const isSubscription = (product.billingInterval || "one_time") !== "one_time";
    const quantity = product.type === "session_solo" ? requestedQty : 1;
    const sessionsQty = product.sessionsQty != null ? product.sessionsQty * quantity : null;
    const amountCents = product.priceCents * quantity;

    const order = await prisma.order.create({
      data: {
        productId: product.id,
        status: "pending",
        amountCents,
        currency: product.currency,
        quantity,
        sessionsQty,
        customerEmail,
        customerName,
        customerPhone,
      },
    });

    const baseUrl = appUrl();
    const commonParams = {
      customer_email: customerEmail,
      client_reference_id: order.id,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pacchetti?checkout=cancelled`,
      metadata: {
        orderId: order.id,
        productId: product.id,
        customerEmail,
        quantity: String(quantity),
      },
    };

    let session;

    if (isSubscription) {
      // ── Abbonamento ricorrente ─────────────────────────────────────────────
      session = await stripe.checkout.sessions.create({
        ...commonParams,
        mode: "subscription",
        subscription_data: {
          metadata: {
            orderId: order.id,
            productId: product.id,
            customerEmail,
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: product.currency,
              unit_amount: product.priceCents,
              recurring: { interval: product.billingInterval }, // "month" o "year"
              product_data: {
                name: product.name,
                description: product.description || undefined,
              },
            },
          },
        ],
      });
    } else {
      // ── Pagamento singolo ─────────────────────────────────────────────────
      session = await stripe.checkout.sessions.create({
        ...commonParams,
        mode: "payment",
        payment_intent_data: {
          metadata: {
            orderId: order.id,
            productId: product.id,
            customerEmail,
            quantity: String(quantity),
          },
        },
        line_items: [
          {
            quantity,
            price_data: {
              currency: product.currency,
              unit_amount: product.priceCents,
              product_data: {
                name: product.name,
                description: product.description || undefined,
              },
            },
          },
        ],
      });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripeSessionId: session.id,
        stripeCustomerId: session.customer || null,
      },
    });

    return res.status(200).json({ ok: true, url: session.url });
  } catch (err) {
    console.error("POST /api/payments/checkout:", err);
    if (err.code === "STRIPE_NOT_CONFIGURED") {
      return res.status(503).json({ ok: false, error: "Stripe non configurato" });
    }
    return res.status(500).json({ ok: false, error: "Checkout non riuscito" });
  }
}

// ─── Webhook handler: checkout.session.completed ─────────────────────────────

async function handleCheckoutCompleted(session) {
  const orderId = session.metadata?.orderId;
  const order = await prisma.order.findFirst({
    where: orderId ? { id: orderId } : { stripeSessionId: session.id },
    include: { product: true, user: true },
  });
  if (!order) throw new Error(`Ordine non trovato per sessione Stripe ${session.id}`);

  const customerDetails = session.customer_details || {};
  const customerEmail = (order.customerEmail || customerDetails.email || "").trim().toLowerCase();
  const customerName = order.customerName || customerDetails.name || customerEmail.split("@")[0];
  const customerPhone = order.customerPhone || customerDetails.phone || null;

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "paid",
      customerEmail,
      customerName,
      customerPhone,
      stripeSessionId: session.id,
      stripePaymentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
    },
    include: { product: true, user: true },
  });

  const { user, inviteToken } = await ensureClientFromPaidOrder(updatedOrder);

  // Aggiorna stripeCustomerId sul User
  if (session.customer && typeof session.customer === "string") {
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: session.customer },
    }).catch(() => {});
  }

  // Crea/aggiorna Subscription se è un abbonamento
  if (session.mode === "subscription" && session.subscription) {
    let stripeSub;
    try {
      const stripe = stripeClient();
      stripeSub = await stripe.subscriptions.retrieve(
        typeof session.subscription === "string" ? session.subscription : session.subscription.id
      );
    } catch (err) {
      console.error("Errore recupero subscription Stripe:", err);
    }

    if (stripeSub) {
      const accessLevel = updatedOrder.product?.accessLevel || "app";
      await upsertSubscription(stripeSub, user.id, updatedOrder.productId, accessLevel);
    }
  }

  // Email post-pagamento
  let emailSent = false;
  let emailAlreadySent = !!updatedOrder.inviteSentAt;
  let emailError = null;
  if (!updatedOrder.inviteSentAt) {
    const emailPayload = {
      to: user.email,
      fullName: user.fullName,
      productName: updatedOrder.product?.name,
      sessionsQty: updatedOrder.sessionsQty,
      isSubscription: session.mode === "subscription",
    };
    try {
      if (inviteToken) {
        await sendClientInviteEmail({ ...emailPayload, token: inviteToken, context: "payment" });
      } else {
        await sendExistingClientPaymentEmail(emailPayload);
      }
      await prisma.order.update({ where: { id: updatedOrder.id }, data: { inviteSentAt: new Date() } });
      emailSent = true;
    } catch (err) {
      console.error("Email post-pagamento non inviata:", err);
      emailError = err.code || err.message || "EMAIL_SEND_FAILED";
    }
  }

  return { orderId: updatedOrder.id, userEmail: user.email, emailSent, emailAlreadySent, emailError };
}

// ─── Webhook handler: subscription events ────────────────────────────────────

async function handleSubscriptionUpdated(stripeSub) {
  // Trova l'utente tramite stripeCustomerId
  const customerId = typeof stripeSub.customer === "string" ? stripeSub.customer : null;
  if (!customerId) return;

  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  if (!user) {
    console.warn(`handleSubscriptionUpdated: user non trovato per customer ${customerId}`);
    return;
  }

  // Trova il prodotto tramite metadata o price
  let productId = stripeSub.metadata?.productId || null;
  let accessLevel = "app";
  if (!productId) {
    const priceId = stripeSub.items?.data?.[0]?.price?.id;
    if (priceId) {
      const product = await prisma.product.findFirst({ where: { stripePriceId: priceId } });
      if (product) { productId = product.id; accessLevel = product.accessLevel || "app"; }
    }
  } else {
    const product = await prisma.product.findFirst({ where: { id: productId } });
    if (product) accessLevel = product.accessLevel || "app";
  }

  await upsertSubscription(stripeSub, user.id, productId, accessLevel);
}

async function handleSubscriptionDeleted(stripeSub) {
  try {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: { status: "canceled", updatedAt: new Date() },
    });
  } catch { /* tabella non ancora presente */ }
}

async function handleInvoiceSucceeded(invoice) {
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  if (!subId) return;
  const stripe = stripeClient();
  try {
    const stripeSub = await stripe.subscriptions.retrieve(subId);
    await handleSubscriptionUpdated(stripeSub);
  } catch (err) {
    console.error("handleInvoiceSucceeded: errore aggiornamento:", err);
  }
}

async function handleInvoiceFailed(invoice) {
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  if (!subId) return;
  try {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subId },
      data: { status: "past_due", updatedAt: new Date() },
    });
  } catch { /* tabella non ancora presente */ }
}

// ─── GET /api/payments/verify-session ────────────────────────────────────────

async function verifySession(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const sessionId = String(req.query.session_id || "");
  if (!sessionId.startsWith("cs_")) {
    return res.status(400).json({ ok: false, error: "Sessione Stripe non valida" });
  }

  try {
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const isPaid = session.payment_status === "paid" || session.status === "complete";
    if (!isPaid) return res.status(200).json({ ok: true, status: "pending" });

    const result = await handleCheckoutCompleted(session);
    return res.status(200).json({
      ok: true,
      status: "paid",
      emailSent: result.emailSent,
      emailAlreadySent: result.emailAlreadySent,
      emailError: result.emailError,
    });
  } catch (err) {
    console.error("GET /api/payments/verify-session:", err);
    return res.status(500).json({ ok: false, error: "Verifica pagamento non riuscita" });
  }
}

// ─── POST /api/payments/webhook ───────────────────────────────────────────────

async function webhook(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const stripe = stripeClient();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];

    let event;
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    } else {
      event = JSON.parse(rawBody.toString("utf8"));
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "checkout.session.expired":
        await prisma.order.updateMany({
          where: { stripeSessionId: event.data.object.id, status: "pending" },
          data: { status: "failed" },
        });
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handleInvoiceSucceeded(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object);
        break;
      default:
        break; // altri eventi ignorati
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("POST /api/payments/webhook:", err);
    return res.status(400).json({ ok: false, error: "Webhook non valido" });
  }
}

// ─── GET /api/payments/orders ─────────────────────────────────────────────────

async function orders(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const where = auth.role === "admin" ? {} : { userId: auth.userId };
    const list = await prisma.order.findMany({
      where,
      include: {
        product: true,
        ...(auth.role === "admin"
          ? { user: { select: { id: true, email: true, fullName: true, client: { select: { id: true, phone: true, goal: true } } } } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return res.status(200).json({ ok: true, orders: list });
  } catch (err) {
    console.error("GET /api/payments/orders:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function handler(req, res) {
  const { action } = req.query;
  if (action === "products")       return products(req, res);
  if (action === "checkout")       return checkout(req, res);
  if (action === "webhook")        return webhook(req, res);
  if (action === "verify-session") return verifySession(req, res);
  if (action === "orders")         return orders(req, res);
  return res.status(404).json({ ok: false, error: "Endpoint pagamenti non trovato" });
}
