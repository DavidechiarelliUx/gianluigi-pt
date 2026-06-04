-- Migrazione Fase 3C — Gianluigi PT
-- Aggiunge i campi necessari per Stripe Checkout e onboarding automatico post-pagamento.

-- Product: prezzo in valuta e vincolo nome unico per seed/upsert idempotente.
ALTER TABLE "Product" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'eur';
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- Order: nasce prima dell'utente, usando i dati raccolti da Checkout.
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'eur';
ALTER TABLE "Order" ADD COLUMN "customerEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Order" ADD COLUMN "inviteSentAt" TIMESTAMP(3);
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- Relazioni Fase 3 definite nello schema Prisma ma lasciate libere nella prima migration.
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
