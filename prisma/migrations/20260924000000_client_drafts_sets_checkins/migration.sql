ALTER TABLE "WorkoutSession" ADD COLUMN "submissionId" TEXT;
CREATE UNIQUE INDEX "WorkoutSession_submissionId_key" ON "WorkoutSession"("submissionId");

UPDATE "WorkoutItemLog" AS log
SET "exerciseId" = COALESCE(log."exerciseId", item."exerciseId"),
    "loadUnit" = COALESCE(log."loadUnit", item."loadType")
FROM "WorkoutItem" AS item
WHERE log."workoutItemId" = item."id"
  AND (log."exerciseId" IS NULL OR log."loadUnit" IS NULL);

CREATE TABLE "WorkoutDraft" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "workoutId" TEXT NOT NULL,
  "workoutDayId" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkoutDraft_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkoutDraft_clientId_workoutId_workoutDayId_key" ON "WorkoutDraft"("clientId", "workoutId", "workoutDayId");
ALTER TABLE "WorkoutDraft" ADD CONSTRAINT "WorkoutDraft_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutDraft" ADD CONSTRAINT "WorkoutDraft_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutDraft" ADD CONSTRAINT "WorkoutDraft_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "WorkoutDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkoutSetLog" (
  "id" TEXT NOT NULL,
  "itemLogId" TEXT NOT NULL,
  "setIndex" INTEGER NOT NULL,
  "loadValue" DOUBLE PRECISION,
  "repsDone" INTEGER,
  "durationSeconds" INTEGER,
  CONSTRAINT "WorkoutSetLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkoutSetLog_itemLogId_setIndex_key" ON "WorkoutSetLog"("itemLogId", "setIndex");
ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_itemLogId_fkey" FOREIGN KEY ("itemLogId") REFERENCES "WorkoutItemLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClientCheckIn" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "energy" INTEGER NOT NULL,
  "difficulty" INTEGER NOT NULL,
  "obstacle" TEXT,
  "coachReply" TEXT,
  "planNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientCheckIn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientCheckIn_clientId_weekStart_key" ON "ClientCheckIn"("clientId", "weekStart");
CREATE INDEX "ClientCheckIn_clientId_createdAt_idx" ON "ClientCheckIn"("clientId", "createdAt");
ALTER TABLE "ClientCheckIn" ADD CONSTRAINT "ClientCheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
