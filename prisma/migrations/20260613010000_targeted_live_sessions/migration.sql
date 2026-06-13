-- Targeted 1:1 live sessions.

ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "targetClientId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'LiveSession_targetClientId_fkey'
  ) THEN
    ALTER TABLE "LiveSession"
      ADD CONSTRAINT "LiveSession_targetClientId_fkey"
      FOREIGN KEY ("targetClientId") REFERENCES "Client"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LiveSession_targetClientId_idx" ON "LiveSession"("targetClientId");

INSERT INTO "Product" (
  "id", "name", "description", "priceCents", "currency", "type", "sessionsQty",
  "discountPercent", "discountTiers", "features", "badgeLabel", "sortOrder",
  "active", "accessLevel", "billingInterval", "createdAt", "updatedAt"
)
VALUES (
  md5(random()::text || clock_timestamp()::text),
  'Applicazione solo cliente',
  'Scelta del personal trainer e creazione della scheda personale. Prodotto futuro, non ancora pubblico.',
  499,
  'eur',
  'package',
  0,
  0,
  NULL,
  '["Applicazione cliente", "Scelta personal trainer", "Creazione scheda personale"]'::jsonb,
  NULL,
  0,
  FALSE,
  'app',
  'month',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;
