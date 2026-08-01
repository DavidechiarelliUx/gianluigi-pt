/**
 * Propaga il tipo di carico dal catalogo al DB — idempotente.
 *
 *   node scripts/backfill-load-type.mjs            # DRY RUN
 *   node scripts/backfill-load-type.mjs --apply
 *
 * 1. Allinea Exercise.loadType al catalogo (server/lib/exercise-catalog.js)
 * 2. Copia il valore sulle righe di scheda esistenti rimaste a 'weight'
 *
 * Le righe che il trainer ha gia' corretto a mano NON vengono toccate: il passo 2
 * agisce solo dove loadType e' ancora il default 'weight' e il catalogo dice altro.
 */
import "dotenv/config";
import { prisma } from "../server/lib/prisma.js";
import { EXERCISE_CATALOG } from "../server/lib/exercise-catalog.js";

const APPLY = process.argv.includes("--apply");
const wanted = new Map(EXERCISE_CATALOG.map((e) => [e.name, e.loadType]));

const exercises = await prisma.exercise.findMany({ select: { id: true, name: true, loadType: true } });
const toFix = exercises.filter((e) => wanted.has(e.name) && wanted.get(e.name) !== e.loadType);
const unknown = exercises.filter((e) => !wanted.has(e.name));

console.log(`\nEsercizi in DB: ${exercises.length} · nel catalogo: ${wanted.size}`);
console.log(`Da riallineare: ${toFix.length}`);
if (unknown.length) console.log(`Fuori catalogo (lasciati com'e'): ${unknown.map((e) => e.name).join(", ")}`);

if (APPLY && toFix.length) {
  for (const [type, group] of Object.entries(
    toFix.reduce((acc, e) => ((acc[wanted.get(e.name)] ??= []).push(e.id), acc), {})
  )) {
    await prisma.exercise.updateMany({ where: { id: { in: group } }, data: { loadType: type } });
    console.log(`  Exercise → ${type}: ${group.length}`);
  }
}

// Passo 2: righe di scheda ancora al default, il cui esercizio vuole altro
const items = await prisma.workoutItem.findMany({
  where: { loadType: "weight" },
  select: { id: true, loadType: true, exercise: { select: { name: true } } },
});
const itemsToFix = items.filter((i) => {
  const target = APPLY ? wanted.get(i.exercise.name) : wanted.get(i.exercise.name);
  return target && target !== "weight";
});

console.log(`\nRighe di scheda da aggiornare: ${itemsToFix.length}/${items.length}`);
const perType = itemsToFix.reduce((acc, i) => ((acc[wanted.get(i.exercise.name)] ??= []).push(i.id), acc), {});
for (const [type, ids] of Object.entries(perType)) console.log(`  → ${type}: ${ids.length} righe`);

if (APPLY) {
  for (const [type, ids] of Object.entries(perType)) {
    await prisma.workoutItem.updateMany({ where: { id: { in: ids } }, data: { loadType: type } });
  }
  console.log("\n✅ Applicato.\n");
} else {
  console.log("\nDRY RUN — rilancia con --apply per scrivere.\n");
}

await prisma.$disconnect();
