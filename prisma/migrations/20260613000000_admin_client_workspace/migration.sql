-- Admin client workspace: message ownership, resolved state and archived requests.

ALTER TABLE "CoachMessage" ADD COLUMN IF NOT EXISTS "senderRole" TEXT NOT NULL DEFAULT 'client';
ALTER TABLE "CoachMessage" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "CoachMessage" ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CoachMessage_status_hiddenAt_idx" ON "CoachMessage"("status", "hiddenAt");
