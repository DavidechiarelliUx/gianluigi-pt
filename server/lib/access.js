/**
 * Logica di accesso centralizzata — Fase 4 Abbonamenti.
 *
 * Gerarchia lookup:
 *   1. Abbonamento Stripe attivo/trialing (status IN active|trialing)
 *   2. Abbonamento past_due ancora nel periodo pagato
 *   3. Ordine one-time pagato (backward compat)
 *   4. Nessun accesso
 */

import { prisma } from "./prisma.js";

// ─── Costanti ────────────────────────────────────────────────────────────────

export const ACCESS_LEVELS = {
  NONE: "none",
  APP: "app",
  LIVE: "live",
  APP_LIVE: "app_live",
  PREMIUM: "premium",
};

const HIERARCHY = { none: 0, app: 1, live: 2, app_live: 3, premium: 4 };

/** Ricava l'access level dal nome del prodotto (fallback per ordini legacy). */
function accessLevelFromName(name = "") {
  const n = name.toLowerCase();
  if (n.includes("premium")) return "premium";
  if (n.includes("app + live") || n.includes("app+live") || n.includes("app e live")) return "app_live";
  if (n.includes("solo live") || (n.includes("live") && !n.includes("app"))) return "live";
  return "app";
}

/** Ritorna l'access level più alto tra i due. */
function maxLevel(a, b) {
  return HIERARCHY[a] >= HIERARCHY[b] ? a : b;
}

// ─── Funzione principale ──────────────────────────────────────────────────────

/**
 * Ritorna gli entitlement per un utente.
 *
 * @param {string} userId
 * @returns {Promise<{
 *   hasAccess: boolean,
 *   accessLevel: string,
 *   source: 'subscription'|'order'|null,
 *   subscription: object|null,
 *   order: object|null,
 *   expiresAt: Date|null,
 *   isPastDue: boolean,
 *   cancelAtPeriodEnd: boolean
 * }>}
 */
export async function getClientEntitlements(userId) {
  if (!userId) {
    return { hasAccess: false, accessLevel: "none", source: null, subscription: null, order: null, expiresAt: null, isPastDue: false, cancelAtPeriodEnd: false };
  }

  // ── 1. Abbonamento attivo ─────────────────────────────────────────────────
  let sub;
  try {
    sub = await prisma.subscription.findFirst({
      where: { userId, status: { in: ["active", "trialing"] } },
      include: { product: true },
      orderBy: { currentPeriodEnd: "desc" },
    });
  } catch {
    // Tabella Subscription non ancora presente (prima della migration) → skip
  }

  if (sub) {
    const periodEnd = sub.currentPeriodEnd;
    const isValid = !periodEnd || new Date(periodEnd) > new Date();
    if (isValid) {
      const accessLevel =
        sub.accessLevel !== "none"
          ? sub.accessLevel
          : maxLevel(
              accessLevelFromName(sub.product?.name),
              (sub.product?.accessLevel !== "none" ? sub.product?.accessLevel : null) || "app"
            );
      return {
        hasAccess: true,
        accessLevel,
        source: "subscription",
        subscription: sub,
        order: null,
        expiresAt: sub.currentPeriodEnd,
        isPastDue: false,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      };
    }
  }

  // ── 2. Past-due ma ancora nel periodo pagato ──────────────────────────────
  let pastDueSub;
  try {
    pastDueSub = await prisma.subscription.findFirst({
      where: { userId, status: "past_due" },
      include: { product: true },
      orderBy: { currentPeriodEnd: "desc" },
    });
  } catch {
    // ignore
  }

  if (pastDueSub?.currentPeriodEnd && new Date(pastDueSub.currentPeriodEnd) > new Date()) {
    const accessLevel =
      pastDueSub.accessLevel !== "none"
        ? pastDueSub.accessLevel
        : accessLevelFromName(pastDueSub.product?.name);
    return {
      hasAccess: true,
      accessLevel,
      source: "subscription",
      subscription: pastDueSub,
      order: null,
      expiresAt: pastDueSub.currentPeriodEnd,
      isPastDue: true,
      cancelAtPeriodEnd: false,
    };
  }

  // ── 3. Ordine one-time pagato (backward compat) ───────────────────────────
  const order = await prisma.order.findFirst({
    where: { userId, status: "paid" },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  if (order) {
    // Usa accessLevel del prodotto se disponibile e non 'none'; altrimenti dal nome
    const storedLevel = order.product?.accessLevel;
    const accessLevel =
      storedLevel && storedLevel !== "none"
        ? maxLevel(storedLevel, accessLevelFromName(order.product?.name))
        : accessLevelFromName(order.product?.name);
    return {
      hasAccess: true,
      accessLevel,
      source: "order",
      subscription: null,
      order,
      expiresAt: null,
      isPastDue: false,
      cancelAtPeriodEnd: false,
    };
  }

  // ── 4. Nessun accesso ─────────────────────────────────────────────────────
  return {
    hasAccess: false,
    accessLevel: "none",
    source: null,
    subscription: null,
    order: null,
    expiresAt: null,
    isPastDue: false,
    cancelAtPeriodEnd: false,
  };
}

/**
 * Controlla se gli entitlement permettono l'accesso a una feature.
 *
 * @param {object} entitlements  Output di getClientEntitlements()
 * @param {'app'|'workouts'|'live'|'premium'|'one_to_one'} feature
 * @returns {boolean}
 */
export function canAccess(entitlements, feature) {
  if (!entitlements?.hasAccess) return false;
  const level = entitlements.accessLevel || "none";

  switch (feature) {
    case "app":
    case "workouts":
      return ["app", "app_live", "premium"].includes(level);
    case "live":
      return ["live", "app_live", "premium"].includes(level);
    case "premium":
    case "one_to_one":
      return level === "premium";
    default:
      return false;
  }
}

/**
 * Serializza gli entitlement per la risposta API al cliente.
 * Restituisce un oggetto "subscription" pubblico, sicuro da esporre.
 */
export function publicEntitlements(entitlements) {
  const {
    hasAccess,
    accessLevel,
    source,
    subscription: sub,
    order,
    isPastDue,
    cancelAtPeriodEnd,
  } = entitlements;

  let productName = null;
  let status = "none";
  let renewsAt = null;
  let validUntil = null;

  if (sub) {
    productName = sub.product?.name || "Abbonamento";
    status = isPastDue ? "past_due" : sub.status || "active";
    renewsAt = cancelAtPeriodEnd ? null : sub.currentPeriodEnd;
    validUntil = sub.currentPeriodEnd;
  } else if (order) {
    productName = order.product?.name || "Acquisto";
    status = "active"; // one-time = sempre attivo finché non scade
  }

  return {
    status,                 // none | active | past_due | canceled
    accessLevel,            // none | app | live | app_live | premium
    source: source || null, // subscription | order | null
    productName,
    renewsAt,               // data di rinnovo (null se canceled/one-time)
    validUntil,             // fine periodo corrente
    cancelAtPeriodEnd,      // se cancellerà a fine periodo
    isPastDue,
    hasAccess,
    hasAppAccess: canAccess(entitlements, "app"),
    hasLiveAccess: canAccess(entitlements, "live"),
    hasPremiumAccess: canAccess(entitlements, "premium"),
  };
}
