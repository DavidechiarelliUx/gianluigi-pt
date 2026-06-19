-- Admin-controlled client app access toggle.
-- Keeps the client in the CRM while blocking/re-enabling app access.

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "accessDisabledAt" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "accessDisabledReason" TEXT;

CREATE INDEX IF NOT EXISTS "Client_accessDisabledAt_idx" ON "Client"("accessDisabledAt");
