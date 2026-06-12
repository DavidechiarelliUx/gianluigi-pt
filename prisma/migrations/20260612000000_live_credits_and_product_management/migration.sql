-- Product management fields and live credit ledger.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "discountTiers" JSONB;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "features" JSONB;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "badgeLabel" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "liveCreditsGrantedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "LiveCreditLedger" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "orderId" TEXT,
  "bookingId" TEXT,
  "externalRef" TEXT,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveCreditLedger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LiveCreditLedger_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LiveCreditLedger_clientId_createdAt_idx" ON "LiveCreditLedger"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "LiveCreditLedger_orderId_idx" ON "LiveCreditLedger"("orderId");
CREATE INDEX IF NOT EXISTS "LiveCreditLedger_bookingId_idx" ON "LiveCreditLedger"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "LiveCreditLedger_externalRef_key" ON "LiveCreditLedger"("externalRef");

INSERT INTO "Product" (
  "id", "name", "description", "priceCents", "currency", "type", "sessionsQty",
  "discountPercent", "discountTiers", "features", "badgeLabel", "sortOrder",
  "active", "accessLevel", "billingInterval", "createdAt", "updatedAt"
)
VALUES
  (
    md5(random()::text || clock_timestamp()::text),
    'Start',
    'Scheda personalizzata, app e supporto messaggi per partire con metodo.',
    2900,
    'eur',
    'package',
    0,
    0,
    NULL,
    '["Scheda personalizzata", "Accesso app", "Supporto messaggi", "Aggiornamento ogni 4 settimane"]'::jsonb,
    NULL,
    1,
    TRUE,
    'app',
    'month',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    md5(random()::text || clock_timestamp()::text),
    'Progress',
    'Percorso seguito con una live inclusa ogni mese.',
    6900,
    'eur',
    'package',
    1,
    0,
    NULL,
    '["Tutto Start", "1 live inclusa", "Check-in settimanale", "Adattamenti su carichi e recupero"]'::jsonb,
    'Consigliato',
    2,
    TRUE,
    'app_live',
    'month',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    md5(random()::text || clock_timestamp()::text),
    'Complete',
    'Percorso completo con tre live incluse ogni mese.',
    11900,
    'eur',
    'package',
    3,
    0,
    NULL,
    '["Tutto Progress", "3 live incluse", "Revisione tecnica esercizi", "Strategia mensile su obiettivo e recupero"]'::jsonb,
    NULL,
    3,
    TRUE,
    'premium',
    'month',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    md5(random()::text || clock_timestamp()::text),
    'Live 1:1 extra',
    'Credito live acquistabile separatamente e usabile dall''area cliente.',
    2500,
    'eur',
    'session_solo',
    1,
    0,
    '[{"minQty":4,"discountPercent":10},{"minQty":8,"discountPercent":20}]'::jsonb,
    '["Credito live 1:1", "Prenotazione dall''app", "Link video integrato"]'::jsonb,
    NULL,
    20,
    TRUE,
    'live',
    'one_time',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "priceCents" = EXCLUDED."priceCents",
  "currency" = EXCLUDED."currency",
  "type" = EXCLUDED."type",
  "sessionsQty" = EXCLUDED."sessionsQty",
  "discountPercent" = EXCLUDED."discountPercent",
  "discountTiers" = EXCLUDED."discountTiers",
  "features" = EXCLUDED."features",
  "badgeLabel" = EXCLUDED."badgeLabel",
  "sortOrder" = EXCLUDED."sortOrder",
  "active" = EXCLUDED."active",
  "accessLevel" = EXCLUDED."accessLevel",
  "billingInterval" = EXCLUDED."billingInterval",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Product"
SET "active" = FALSE, "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" IN ('Start Check', 'App Starter', 'App Mensile', 'App + Live', 'Premium 1:1');
