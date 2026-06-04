-- Migrazione Fase 3 — Gianluigi PT
-- Aggiunge: enums (ProductType, OrderStatus, LiveSessionType, LiveSessionStatus, BookingStatus)
--           modelli: Product, Order, LiveSession, Booking
--           relazioni: User.orders, Client.bookings

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

CREATE TYPE "ProductType" AS ENUM ('session_solo', 'session_group', 'package');
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE "LiveSessionType" AS ENUM ('solo', 'group');
CREATE TYPE "LiveSessionStatus" AS ENUM ('scheduled', 'live', 'completed', 'cancelled');
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

-- ─────────────────────────────────────────
-- PRODUCT
-- ─────────────────────────────────────────

CREATE TABLE "Product" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "priceCents"  INTEGER NOT NULL,
    "type"        "ProductType" NOT NULL,
    "sessionsQty" INTEGER,
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────
-- ORDER
-- ─────────────────────────────────────────

CREATE TABLE "Order" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "productId"       TEXT NOT NULL,
    "status"          "OrderStatus" NOT NULL DEFAULT 'pending',
    "amountCents"     INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE INDEX "Order_stripeSessionId_idx" ON "Order"("stripeSessionId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────
-- LIVE SESSION
-- ─────────────────────────────────────────

CREATE TABLE "LiveSession" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "type"        "LiveSessionType" NOT NULL DEFAULT 'solo',
    "status"      "LiveSessionStatus" NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "maxSlots"    INTEGER NOT NULL DEFAULT 1,
    "productId"   TEXT,
    "videoLink"   TEXT,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiveSession_scheduledAt_status_idx" ON "LiveSession"("scheduledAt", "status");

-- ─────────────────────────────────────────
-- BOOKING
-- ─────────────────────────────────────────

CREATE TABLE "Booking" (
    "id"            TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "clientId"      TEXT NOT NULL,
    "status"        "BookingStatus" NOT NULL DEFAULT 'confirmed',
    "orderId"       TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Booking_liveSessionId_clientId_key" ON "Booking"("liveSessionId", "clientId");
CREATE INDEX "Booking_clientId_idx" ON "Booking"("clientId");
CREATE INDEX "Booking_liveSessionId_idx" ON "Booking"("liveSessionId");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_liveSessionId_fkey"
    FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
