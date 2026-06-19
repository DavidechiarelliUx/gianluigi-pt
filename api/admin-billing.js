import Stripe from "stripe";
import { prisma } from "../server/lib/prisma.js";
import { requireAdmin } from "../server/lib/guards.js";
import { parseJsonBody, methodNotAllowed } from "../server/lib/body.js";
import { sendPaymentDocumentEmail } from "../server/lib/mailer.js";

const ACCESS_LEVELS = ["none", "app", "live", "app_live", "premium"];
const SUB_STATUSES = ["active", "trialing", "past_due", "unpaid", "canceled", "incomplete"];
const ORDER_STATUSES = ["pending", "paid", "failed", "refunded"];

/**
 * Gestione abbonamenti/pagamenti (solo admin).
 * GET  /api/admin-billing                → { subscriptions, orders }
 * POST /api/admin-billing  body:
 *   { type:"subscription", id, status?, accessLevel?, currentPeriodEnd?, cancelAtPeriodEnd? }
 *   { type:"order", id, status? }
 *   { type:"invoice", id } → invia fattura/ricevuta Stripe dell'ordine al cliente
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

    if (type === "invoice") {
      const result = await sendOrderInvoice(id);
      return res.status(200).json({ ok: true, ...result });
    }

    return res.status(400).json({ ok: false, error: "type non valido (subscription|order|invoice)" });
  } catch (err) {
    console.error("POST /api/admin-billing:", err);
    if (err.code === "P2025") return res.status(404).json({ ok: false, error: "Record non trovato" });
    if (err.code === "ORDER_NOT_PAID") return res.status(400).json({ ok: false, error: err.message });
    if (err.code === "DOCUMENT_NOT_AVAILABLE") return res.status(404).json({ ok: false, error: err.message });
    if (err.code === "CUSTOMER_EMAIL_MISSING") return res.status(400).json({ ok: false, error: err.message });
    if (err.code === "STRIPE_NOT_CONFIGURED") return res.status(503).json({ ok: false, error: "Stripe non configurato" });
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    const err = new Error("Stripe non configurato");
    err.code = "STRIPE_NOT_CONFIGURED";
    throw err;
  }
  return new Stripe(key);
}

function money(cents = 0, currency = "eur") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: String(currency || "eur").toUpperCase(),
  }).format((Number(cents) || 0) / 100);
}

async function retrieveCharge(stripe, chargeRef) {
  if (!chargeRef) return null;
  if (typeof chargeRef === "object") return chargeRef;
  if (typeof chargeRef === "string") return stripe.charges.retrieve(chargeRef);
  return null;
}

async function documentFromPaymentIntent(stripe, paymentIntentRef) {
  if (!paymentIntentRef) return null;
  const paymentIntent =
    typeof paymentIntentRef === "object"
      ? paymentIntentRef
      : await stripe.paymentIntents.retrieve(paymentIntentRef, { expand: ["latest_charge"] });
  const charge = await retrieveCharge(stripe, paymentIntent?.latest_charge);
  if (charge?.receipt_url) return { url: charge.receipt_url, type: "receipt" };
  return null;
}

async function documentFromInvoice(stripe, invoiceRef) {
  if (!invoiceRef) return null;
  const invoice = typeof invoiceRef === "object" ? invoiceRef : await stripe.invoices.retrieve(invoiceRef);
  if (invoice?.hosted_invoice_url) return { url: invoice.hosted_invoice_url, type: "invoice" };
  if (invoice?.invoice_pdf) return { url: invoice.invoice_pdf, type: "invoice" };
  if (invoice?.payment_intent) return documentFromPaymentIntent(stripe, invoice.payment_intent);
  return null;
}

async function stripeDocumentForOrder(order) {
  const stripe = stripeClient();

  if (order.stripeSessionId) {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId, {
      expand: ["invoice", "payment_intent.latest_charge"],
    });
    const invoiceDoc = await documentFromInvoice(stripe, session.invoice);
    if (invoiceDoc) return invoiceDoc;
    const paymentDoc = await documentFromPaymentIntent(stripe, session.payment_intent);
    if (paymentDoc) return paymentDoc;
  }

  if (order.stripePaymentId) {
    const paymentDoc = await documentFromPaymentIntent(stripe, order.stripePaymentId);
    if (paymentDoc) return paymentDoc;
  }

  return null;
}

async function sendOrderInvoice(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      product: { select: { name: true } },
      user: { select: { fullName: true, email: true } },
    },
  });
  if (!order) {
    const err = new Error("Ordine non trovato");
    err.code = "P2025";
    throw err;
  }
  if (order.status !== "paid") {
    const err = new Error("Puoi inviare la fattura solo per pagamenti confermati");
    err.code = "ORDER_NOT_PAID";
    throw err;
  }

  const document = await stripeDocumentForOrder(order);
  if (!document?.url) {
    const err = new Error("Documento Stripe non disponibile per questo ordine");
    err.code = "DOCUMENT_NOT_AVAILABLE";
    throw err;
  }

  const to = order.user?.email || order.customerEmail;
  if (!to) {
    const err = new Error("Email cliente mancante");
    err.code = "CUSTOMER_EMAIL_MISSING";
    throw err;
  }

  await sendPaymentDocumentEmail({
    to,
    fullName: order.user?.fullName || order.customerName,
    productName: order.product?.name || "Pagamento Gianluigi PT",
    amountLabel: money(order.amountCents, order.currency),
    documentUrl: document.url,
    documentType: document.type,
  });

  return { sent: true, documentType: document.type, to };
}
