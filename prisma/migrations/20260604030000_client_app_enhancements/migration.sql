-- Client app enhancements: progress metrics and coach messages.

CREATE TABLE "ClientMetric" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "weightKg" DOUBLE PRECISION,
  "waistCm" DOUBLE PRECISION,
  "chestCm" DOUBLE PRECISION,
  "hipsCm" DOUBLE PRECISION,
  "photoUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachMessage" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),

  CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientMetric_clientId_date_idx" ON "ClientMetric"("clientId", "date");
CREATE INDEX "CoachMessage_clientId_createdAt_idx" ON "CoachMessage"("clientId", "createdAt");

ALTER TABLE "ClientMetric"
  ADD CONSTRAINT "ClientMetric_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachMessage"
  ADD CONSTRAINT "CoachMessage_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
