/**
 * Backup completo di schede e storico allenamenti — SOLA LETTURA.
 *
 *   node scripts/backup-clients.mjs                  # tutti i clienti
 *   node scripts/backup-clients.mjs jessica davide   # filtra per nome/email
 *
 * Scrive backups/backup-<timestamp>.json con gli ID originali, cosi'
 * scripts/restore-clients.mjs puo' ricreare le righe identiche e tutti i
 * collegamenti (WorkoutItemLog → workoutItemId) restano validi.
 *
 * NON esporta password, token o dati Stripe.
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../server/lib/prisma.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filters = process.argv.slice(2).map((a) => a.toLowerCase());

const matches = (client) => {
  if (!filters.length) return true;
  const hay = `${client.user?.fullName ?? ""} ${client.user?.email ?? ""}`.toLowerCase();
  return filters.some((f) => hay.includes(f));
};

const clients = (
  await prisma.client.findMany({
    include: {
      user: { select: { id: true, email: true, fullName: true } },
      workouts: {
        include: {
          days: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
        },
      },
      workoutSessions: { orderBy: { date: "asc" }, include: { itemLogs: true } },
      metrics: { orderBy: { date: "asc" } },
    },
  })
).filter(matches);

if (!clients.length) {
  console.error("Nessun cliente corrisponde ai filtri:", filters.join(", ") || "(nessuno)");
  await prisma.$disconnect();
  process.exit(1);
}

// Catalogo esercizi: serve a rileggere il backup in chiaro fra sei mesi.
const exercises = await prisma.exercise.findMany({ select: { id: true, name: true, muscleGroup: true } });

const backup = { takenAt: new Date().toISOString(), schema: 1, exercises, clients };

const dir = path.join(ROOT, "backups");
await mkdir(dir, { recursive: true });
const file = path.join(dir, `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
await writeFile(file, JSON.stringify(backup, null, 2));

const nameOf = (c) => c.user?.fullName ?? c.id;
console.log(`\nBackup scritto: ${path.relative(ROOT, file)}\n`);
for (const c of clients) {
  const items = c.workouts.reduce((n, w) => n + w.days.reduce((m, d) => m + d.items.length, 0), 0);
  const logs = c.workoutSessions.reduce((n, s) => n + s.itemLogs.length, 0);
  console.log(
    `  ${nameOf(c)}: ${c.workouts.length} schede (${items} esercizi), ` +
      `${c.workoutSessions.length} sessioni, ${logs} log, ${c.metrics.length} check-in`
  );
  for (const w of c.workouts) {
    console.log(`     · [${w.status}] "${w.title}" — ${w.days.length} giorni — ${w.id}`);
  }
}
console.log("");
await prisma.$disconnect();
