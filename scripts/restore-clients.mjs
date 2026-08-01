/**
 * Ripristina schede e storico da un file di backups/.
 *
 *   node scripts/restore-clients.mjs backups/backup-....json           # DRY RUN
 *   node scripts/restore-clients.mjs backups/backup-....json --apply   # scrive
 *
 * Ricrea solo cio' che MANCA, con gli ID originali: le righe gia' presenti non
 * vengono toccate, quindi il ripristino e' ripetibile e non sovrascrive dati
 * piu' recenti. Ordine: Workout → Day → Item → Session → ItemLog, cosi' ogni
 * WorkoutItemLog ritrova il suo workoutItemId.
 *
 * Non tocca User, Subscription, Product: solo allenamenti e check-in.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { prisma } from "../server/lib/prisma.js";

const [fileArg, ...flags] = process.argv.slice(2);
const APPLY = flags.includes("--apply");

if (!fileArg) {
  console.error("Uso: node scripts/restore-clients.mjs <file-backup.json> [--apply]");
  process.exit(1);
}

const backup = JSON.parse(await readFile(fileArg, "utf8"));
const plan = [];
const missing = [];

async function existingIds(model, ids) {
  if (!ids.length) return new Set();
  const rows = await prisma[model].findMany({ where: { id: { in: ids } }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

for (const client of backup.clients) {
  const label = client.user?.fullName ?? client.id;

  if (!(await prisma.client.findUnique({ where: { id: client.id }, select: { id: true } }))) {
    missing.push(`Cliente "${label}" (${client.id}) non esiste piu': ripristinalo prima a mano.`);
    continue;
  }

  const workouts = client.workouts;
  const days = workouts.flatMap((w) => w.days);
  const items = days.flatMap((d) => d.items);
  const sessions = client.workoutSessions;
  const logs = sessions.flatMap((s) => s.itemLogs);

  const have = {
    workout: await existingIds("workout", workouts.map((w) => w.id)),
    workoutDay: await existingIds("workoutDay", days.map((d) => d.id)),
    workoutItem: await existingIds("workoutItem", items.map((i) => i.id)),
    workoutSession: await existingIds("workoutSession", sessions.map((s) => s.id)),
    workoutItemLog: await existingIds("workoutItemLog", logs.map((l) => l.id)),
    clientMetric: await existingIds("clientMetric", client.metrics.map((m) => m.id)),
  };

  plan.push({
    label,
    workouts: workouts.filter((w) => !have.workout.has(w.id)),
    days: days.filter((d) => !have.workoutDay.has(d.id)),
    items: items.filter((i) => !have.workoutItem.has(i.id)),
    sessions: sessions.filter((s) => !have.workoutSession.has(s.id)),
    logs: logs.filter((l) => !have.workoutItemLog.has(l.id)),
    metrics: client.metrics.filter((m) => !have.clientMetric.has(m.id)),
    totals: { workouts: workouts.length, sessions: sessions.length, logs: logs.length },
  });
}

console.log(`\nBackup del ${backup.takenAt}`);
console.log(APPLY ? "MODALITA': RIPRISTINO REALE\n" : "MODALITA': DRY RUN (aggiungi --apply per scrivere)\n");

for (const m of missing) console.log(`  ⚠️  ${m}`);

let nothingToDo = true;
for (const p of plan) {
  const n = p.workouts.length + p.days.length + p.items.length + p.sessions.length + p.logs.length + p.metrics.length;
  if (n === 0) {
    console.log(`  ✅ ${p.label}: tutto presente (${p.totals.workouts} schede, ${p.totals.sessions} sessioni, ${p.totals.logs} log) — niente da fare`);
    continue;
  }
  nothingToDo = false;
  console.log(`  ⚠️  ${p.label}: da ripristinare →`);
  for (const [k, v] of Object.entries({ schede: p.workouts, giorni: p.days, esercizi: p.items, sessioni: p.sessions, log: p.logs, "check-in": p.metrics })) {
    if (v.length) console.log(`        ${v.length} ${k}`);
  }
}

if (!APPLY || nothingToDo) {
  if (nothingToDo && !missing.length) console.log("\nNessun dato perso. 🎉\n");
  else if (!APPLY) console.log("\nRilancia con --apply per ripristinare.\n");
  await prisma.$disconnect();
  process.exit(0);
}

// ── Scrittura ────────────────────────────────────────────────────────────────
const strip = (row, keys) => Object.fromEntries(Object.entries(row).filter(([k]) => !keys.includes(k)));

for (const p of plan) {
  await prisma.$transaction(async (tx) => {
    if (p.workouts.length)
      await tx.workout.createMany({ data: p.workouts.map((w) => strip(w, ["days"])), skipDuplicates: true });
    if (p.days.length)
      await tx.workoutDay.createMany({ data: p.days.map((d) => strip(d, ["items"])), skipDuplicates: true });
    if (p.items.length)
      await tx.workoutItem.createMany({ data: p.items, skipDuplicates: true });
    if (p.sessions.length)
      await tx.workoutSession.createMany({ data: p.sessions.map((s) => strip(s, ["itemLogs"])), skipDuplicates: true });
    if (p.logs.length)
      await tx.workoutItemLog.createMany({ data: p.logs, skipDuplicates: true });
    if (p.metrics.length)
      await tx.clientMetric.createMany({ data: p.metrics, skipDuplicates: true });
  });
  console.log(`  ↻ ${p.label}: ripristinato.`);
}

console.log("\nFatto. Rilancia in dry run per verificare.\n");
await prisma.$disconnect();
