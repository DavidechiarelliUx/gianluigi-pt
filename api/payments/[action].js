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
    name: "Applicazione solo cliente",
    description: "Scelta del personal trainer e creazione della scheda personale. Prodotto futuro, non ancora pubblico.",
    priceCents: 499,
    type: "package",
    sessionsQty: 0,
    accessLevel: "app",
    billingInterval: "month",
    sortOrder: 0,
    active: false,
    features: ["Applicazione cliente", "Scelta personal trainer", "Creazione scheda personale"],
  },
  {
    name: "Start",
    description: "Scheda personalizzata, app e supporto messaggi per partire con metodo.",
    priceCents: 2900,
    type: "package",
    sessionsQty: 0,
    accessLevel: "app",
    billingInterval: "month",
    sortOrder: 1,
    features: ["Scheda personalizzata", "Accesso app", "Supporto messaggi", "Aggiornamento ogni 4 settimane"],
  },
  {
    name: "Progress",
    description: "Percorso seguito con una live inclusa ogni mese.",
    priceCents: 6900,
    type: "package",
    sessionsQty: 1,
    accessLevel: "app_live",
    billingInterval: "month",
    sortOrder: 2,
    badgeLabel: "Consigliato",
    features: ["Tutto Start", "1 live inclusa", "Check-in settimanale", "Adattamenti su carichi e recupero"],
  },
  {
    name: "Complete",
    description: "Percorso completo con tre live incluse ogni mese.",
    priceCents: 11900,
    type: "package",
    sessionsQty: 3,
    accessLevel: "premium",
    billingInterval: "month",
    sortOrder: 3,
    features: ["Tutto Progress", "3 live incluse", "Revisione tecnica esercizi", "Strategia mensile su obiettivo e recupero"],
  },
  {
    name: "Live 1:1 extra",
    description: "Credito live acquistabile separatamente e usabile dall'area cliente.",
    priceCents: 2500,
    type: "session_solo",
    sessionsQty: 1,
    accessLevel: "live",
    billingInterval: "one_time",
    sortOrder: 20,
    discountTiers: [
      { minQty: 4, discountPercent: 10 },
      { minQty: 8, discountPercent: 20 },
    ],
    features: ["Credito live 1:1", "Prenotazione dall'app", "Link video integrato"],
  },
];

const LEGACY_PRODUCT_NAMES = ["Start Check", "App Starter", "App Mensile", "App + Live", "Premium 1:1"];

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

function clampDiscount(value) {
  const parsed = Number(value) || 0;
  return Math.max(0, Math.min(90, Math.round(parsed)));
}

function featuresList(product) {
  return Array.isArray(product.features) ? product.features : [];
}

function discountTiers(product) {
  return Array.isArray(product.discountTiers)
    ? product.discountTiers
        .map((tier) => ({
          minQty: Math.max(1, Number(tier.minQty) || 1),
          discountPercent: clampDiscount(tier.discountPercent),
        }))
        .filter((tier) => tier.discountPercent > 0)
        .sort((a, b) => a.minQty - b.minQty)
    : [];
}

function appliedDiscountPercent(product, quantity = 1) {
  const baseDiscount = clampDiscount(product.discountPercent);
  const tierDiscount = discountTiers(product)
    .filter((tier) => quantity >= tier.minQty)
    .reduce((max, tier) => Math.max(max, tier.discountPercent), 0);
  return Math.max(baseDiscount, tierDiscount);
}

function effectiveUnitAmount(product, quantity = 1) {
  const discount = appliedDiscountPercent(product, quantity);
  return Math.max(50, Math.round(product.priceCents * (100 - discount) / 100));
}

function stripeTimestampToDate(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000) : null;
}

function subscriptionPeriodDate(stripeSub, field) {
  return (
    stripeTimestampToDate(stripeSub?.[field]) ||
    stripeTimestampToDate(stripeSub?.items?.data?.find((item) => item?.[field])?.[field])
  );
}

function liveCreditsForProduct(product, quantity = 1) {
  const qty = Math.max(0, Number(quantity) || 0);
  if (!product || qty <= 0) return 0;
  const configuredCredits = Math.max(0, Number(product.sessionsQty) || 0);
  const creditsPerUnit = product.type === "session_solo"
    ? Math.max(1, configuredCredits)
    : configuredCredits;
  return creditsPerUnit * qty;
}

function publicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    effectivePriceCents: effectiveUnitAmount(product, 1),
    discountPercent: appliedDiscountPercent(product, 1),
    discountTiers: discountTiers(product),
    features: featuresList(product),
    badgeLabel: product.badgeLabel,
    sortOrder: product.sortOrder || 0,
    currency: product.currency,
    type: product.type,
    sessionsQty: product.sessionsQty,
    accessLevel: product.accessLevel || "app",
    billingInterval: product.billingInterval || "one_time",
    isSubscription: (product.billingInterval || "one_time") !== "one_time",
    launchCapacity: null,
    remainingSeats: null,
  };
}

async function ensureDefaultProducts() {
  for (const item of DEFAULT_PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { name: item.name }, select: { id: true } });
    if (!existing) {
      await prisma.product.create({ data: { ...item, currency: "eur", active: item.active ?? true } });
    }
  }
  await prisma.product.updateMany({
    where: { name: { in: LEGACY_PRODUCT_NAMES } },
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

async function grantLiveCreditsForOrder(order, client) {
  const credits = Number(order.sessionsQty) > 0
    ? Number(order.sessionsQty)
    : liveCreditsForProduct(order.product, order.quantity || 1);
  if (!client?.id || credits <= 0) return false;

  const existingOrder = await prisma.order.findUnique({
    where: { id: order.id },
    select: { liveCreditsGrantedAt: true },
  });
  if (existingOrder?.liveCreditsGrantedAt) return false;

  await prisma.$transaction(async (tx) => {
    await tx.liveCreditLedger.upsert({
      where: { externalRef: `order:${order.id}` },
      update: {},
      create: {
        clientId: client.id,
        orderId: order.id,
        externalRef: `order:${order.id}`,
        amount: credits,
        reason: "purchase",
        note: `Acquisto ${order.product?.name || "pacchetto"}`,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        liveCreditsGrantedAt: new Date(),
        ...(Number(order.sessionsQty) > 0 ? {} : { sessionsQty: credits }),
      },
    });
  });

  return true;
}

async function grantLiveCreditsForInvoice(invoice, stripeSub) {
  if (invoice.billing_reason !== "subscription_cycle") return false;

  const productId = stripeSub?.metadata?.productId || null;
  const customerId = typeof stripeSub?.customer === "string" ? stripeSub.customer : null;
  if (!productId || !customerId || !invoice.id) return false;

  const [product, user] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.user.findFirst({ where: { stripeCustomerId: customerId }, include: { client: true } }),
  ]);

  const credits = Number(product?.sessionsQty) || 0;
  if (!user?.client?.id || credits <= 0) return false;

  await prisma.liveCreditLedger.upsert({
    where: { externalRef: `invoice:${invoice.id}` },
    update: {},
    create: {
      clientId: user.client.id,
      externalRef: `invoice:${invoice.id}`,
      amount: credits,
      reason: "purchase",
      note: `Rinnovo ${product.name}`,
    },
  });

  return true;
}

// ─── Gestione Stripe Subscription nel DB ─────────────────────────────────────

/** Crea o aggiorna un record Subscription dal payload Stripe. */
async function upsertSubscription(stripeSub, userId, productId, accessLevel) {
  const level = accessLevel || "app";
  const currentPeriodStart = subscriptionPeriodDate(stripeSub, "current_period_start");
  const currentPeriodEnd = subscriptionPeriodDate(stripeSub, "current_period_end");
  const periodUpdate = {
    ...(currentPeriodStart ? { currentPeriodStart } : {}),
    ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
  };

  try {
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: stripeSub.id },
      update: {
        status: stripeSub.status,
        stripePriceId: stripeSub.items?.data?.[0]?.price?.id || null,
        stripeCustomerId: typeof stripeSub.customer === "string" ? stripeSub.customer : null,
        accessLevel: level,
        ...periodUpdate,
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
        currentPeriodStart,
        currentPeriodEnd,
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
    return res.status(200).json({
      ok: true,
      products: list.map((p) => publicProduct(p)),
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
  const requestedExtraLiveQty = Math.max(0, Math.min(20, Number(body.liveQuantity) || 0));
  // returnTo:'app' → success/cancel puntano all'area cliente invece che alle pagine pubbliche
  const returnToApp = body.returnTo === "app";

  if (!productId || !isEmail(customerEmail) || customerName.length < 2) {
    return res.status(400).json({ ok: false, error: "Prodotto, nome ed email sono obbligatori" });
  }

  try {
    const stripe = stripeClient();
    const product = await prisma.product.findFirst({ where: { id: productId, active: true } });
    if (!product) return res.status(404).json({ ok: false, error: "Prodotto non trovato" });

    const isSubscription = (product.billingInterval || "one_time") !== "one_time";
    const quantity = product.type === "session_solo" ? requestedQty : 1;
    const extraLiveQuantity = product.type === "package" ? requestedExtraLiveQty : 0;
    const liveProduct = extraLiveQuantity > 0
      ? await prisma.product.findFirst({ where: { active: true, type: "session_solo" }, orderBy: { sortOrder: "asc" } })
      : null;
    if (extraLiveQuantity > 0 && !liveProduct) {
      return res.status(404).json({ ok: false, error: "Prodotto live non configurato" });
    }

    const productUnitAmount = effectiveUnitAmount(product, quantity);
    const liveUnitAmount = liveProduct ? effectiveUnitAmount(liveProduct, extraLiveQuantity) : 0;
    const productLiveCredits = liveCreditsForProduct(product, quantity);
    const extraLiveCredits = liveCreditsForProduct(liveProduct, extraLiveQuantity);
    const sessionsQty = productLiveCredits + extraLiveCredits;
    const amountCents = productUnitAmount * quantity + liveUnitAmount * extraLiveQuantity;

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

    // Lookup stripeCustomerId per pre-compilare i metodi di pagamento salvati
    let stripeCustomerId;
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: customerEmail },
        select: { stripeCustomerId: true },
      });
      if (existingUser?.stripeCustomerId) stripeCustomerId = existingUser.stripeCustomerId;
    } catch { /* non bloccante */ }

    const commonParams = {
      ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: customerEmail }),
      client_reference_id: order.id,
      success_url: returnToApp
        ? `${baseUrl}/area-cliente?checkout=success&session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: returnToApp
        ? `${baseUrl}/area-cliente/abbonamenti?checkout=cancelled`
        : `${baseUrl}/pacchetti?checkout=cancelled`,
      metadata: {
        orderId: order.id,
        productId: product.id,
        customerEmail,
        quantity: String(quantity),
        liveQuantity: String(extraLiveQuantity),
        sessionsQty: String(sessionsQty),
      },
    };

    const primaryLineItem = {
      quantity,
      price_data: {
        currency: product.currency,
        unit_amount: productUnitAmount,
        ...(isSubscription ? { recurring: { interval: product.billingInterval } } : {}),
        product_data: {
          name: product.name,
          description: product.description || undefined,
        },
      },
    };

    const extraLiveLineItem = liveProduct && extraLiveQuantity > 0
      ? {
          quantity: extraLiveQuantity,
          price_data: {
            currency: liveProduct.currency,
            unit_amount: liveUnitAmount,
            product_data: {
              name: liveProduct.name,
              description: liveProduct.description || undefined,
            },
          },
        }
      : null;

    const lineItems = [primaryLineItem, extraLiveLineItem].filter(Boolean);

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
            sessionsQty: String(productLiveCredits),
          },
        },
        line_items: lineItems,
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
            sessionsQty: String(sessionsQty),
          },
        },
        line_items: lineItems,
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

  const { user, client, inviteToken } = await ensureClientFromPaidOrder(updatedOrder);
  await grantLiveCreditsForOrder(updatedOrder, client);

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
    await grantLiveCreditsForInvoice(invoice, stripeSub);
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
    const includePending = req.query.includePending === "1" || req.query.includePending === "true";
    const where = {
      ...(auth.role === "admin" ? {} : { userId: auth.userId }),
      ...(includePending ? {} : { status: { not: "pending" } }),
    };
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
