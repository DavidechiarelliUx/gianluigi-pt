-- Migration: add_subscriptions
-- Fase 4 — Abbonamenti Stripe ricorrenti
-- Aggiunge: AccessLevel, BillingInterval enums, Subscription model
-- Aggiorna: User (stripeCustomerId), Product (accessLevel, billingInterval, stripePriceId)

-- ─── Nuovi enum ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccessLevel') THEN
    CREATE TYPE "AccessLevel" AS ENUM ('none', 'app', 'live', 'app_live', 'premium');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingInterval') THEN
    CREATE TYPE "BillingInterval" AS ENUM ('one_time', 'month', 'year');
  END IF;
END $$;

-- ─── User: aggiungi stripeCustomerId ──────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

-- ─── Product: aggiungi colonne fase 4 ────────────────────────────────────────

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "accessLevel" "AccessLevel" NOT NULL DEFAULT 'app';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "billingInterval" "BillingInterval" NOT NULL DEFAULT 'one_time';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;

-- Imposta access level e billing interval corretti per i prodotti esistenti
UPDATE "Product" SET "accessLevel" = 'premium',  "billingInterval" = 'month'    WHERE name = 'Premium 1:1';
UPDATE "Product" SET "accessLevel" = 'app_live',  "billingInterval" = 'month'    WHERE name = 'App + Live';
UPDATE "Product" SET "accessLevel" = 'app',       "billingInterval" = 'month'    WHERE name = 'App Mensile';
UPDATE "Product" SET "accessLevel" = 'app',       "billingInterval" = 'one_time' WHERE name = 'App Starter';
UPDATE "Product" SET "accessLevel" = 'app',       "billingInterval" = 'one_time' WHERE name = 'Start Check';

-- ─── Subscription model ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"                   TEXT        NOT NULL,
  "userId"               TEXT        NOT NULL,
  "productId"            TEXT,
  "stripeSubscriptionId" TEXT        NOT NULL,
  "stripePriceId"        TEXT,
  "stripeCustomerId"     TEXT,
  "status"               TEXT        NOT NULL,
  "accessLevel"          "AccessLevel" NOT NULL DEFAULT 'app',
  "currentPeriodStart"   TIMESTAMP(3),
  "currentPeriodEnd"     TIMESTAMP(3),
  "cancelAtPeriodEnd"    BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key"
  ON "Subscription"("stripeSubscriptionId");

CREATE INDEX IF NOT EXISTS "Subscription_userId_status_idx"
  ON "Subscription"("userId", "status");

CREATE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_idx"
  ON "Subscription"("stripeSubscriptionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_userId_fkey'
  ) THEN
    ALTER TABLE "Subscription"
      ADD CONSTRAINT "Subscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_productId_fkey'
  ) THEN
    ALTER TABLE "Subscription"
      ADD CONSTRAINT "Subscription_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Nota: eseguire "npx prisma generate" dopo la migration per aggiornare il client.
