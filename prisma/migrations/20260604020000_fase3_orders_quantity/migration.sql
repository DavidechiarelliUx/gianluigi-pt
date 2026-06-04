-- Migrazione Fase 3C — quantità ordini
-- Permette checkout con numero variabile di sessioni e storico crediti acquistati.

ALTER TABLE "Order" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Order" ADD COLUMN "sessionsQty" INTEGER;
