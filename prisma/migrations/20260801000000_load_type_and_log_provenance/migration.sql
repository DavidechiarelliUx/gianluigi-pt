-- Tipo di carico deciso dal trainer + tracciabilità dei log.
-- Migration puramente ADDITIVA: nessuna colonna esistente viene modificata o rimossa.

-- 1. Enum del tipo di carico
CREATE TYPE "LoadType" AS ENUM ('weight', 'time', 'body');

-- 2. Esercizio: valore di default usato per pre-compilare il builder scheda
ALTER TABLE "Exercise" ADD COLUMN "loadType" "LoadType" NOT NULL DEFAULT 'weight';

-- 3. Riga di scheda: la verità che il cliente segue (il cliente non sceglie più)
ALTER TABLE "WorkoutItem" ADD COLUMN "loadType" "LoadType" NOT NULL DEFAULT 'weight';

-- 4. Log: provenienza + carico strutturato + skip esplicito
ALTER TABLE "WorkoutItemLog" ADD COLUMN "exerciseId" TEXT;
ALTER TABLE "WorkoutItemLog" ADD COLUMN "skipped" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkoutItemLog" ADD COLUMN "loadValue" DOUBLE PRECISION;
ALTER TABLE "WorkoutItemLog" ADD COLUMN "loadUnit" "LoadType";
CREATE INDEX "WorkoutItemLog_exerciseId_idx" ON "WorkoutItemLog"("exerciseId");

-- 5. Sessione: congela l'obiettivo settimanale usato dallo streak
ALTER TABLE "WorkoutSession" ADD COLUMN "planDays" INTEGER;

-- ── Backfill dei dati esistenti ─────────────────────────────────────────────

-- 5a. planDays dalle schede attuali
UPDATE "WorkoutSession" s
SET "planDays" = (SELECT COUNT(*) FROM "WorkoutDay" d WHERE d."workoutId" = s."workoutId")
WHERE s."planDays" IS NULL;

-- 4a. exerciseId sui log storici, finché la riga di scheda esiste ancora
UPDATE "WorkoutItemLog" l
SET "exerciseId" = i."exerciseId"
FROM "WorkoutItem" i
WHERE l."workoutItemId" = i."id" AND l."exerciseId" IS NULL;

-- Nota: Exercise."loadType" e WorkoutItem."loadType" restano a 'weight' qui.
-- Il valore reale arriva dal catalogo (server/lib/exercise-catalog.js) via la
-- sincronizzazione in GET /api/admin/exercises, poi scripts/backfill-load-type.mjs
-- propaga il valore dagli esercizi alle righe di scheda già esistenti.
