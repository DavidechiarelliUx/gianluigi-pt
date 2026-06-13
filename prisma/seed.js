/**
 * Seed iniziale — Fase 2.
 * Crea l'utente admin (da env ADMIN_EMAIL / ADMIN_PASSWORD) e un catalogo
 * di esercizi base. Idempotente: usa upsert, si può rilanciare senza duplicare.
 *
 * Richiede env: DATABASE_URL (pooled), ADMIN_EMAIL, ADMIN_PASSWORD.
 * Esecuzione: `npx prisma db seed` (configurato in prisma.config.ts).
 */
import bcrypt from "bcryptjs";
import { prisma } from "../server/lib/prisma.js";
import { EXERCISE_CATALOG } from "../server/lib/exercise-catalog.js";

const PRODUCTS = [
  {
    name: "Applicazione solo cliente",
    description: "Scelta del personal trainer e creazione della scheda personale. Prodotto futuro, non ancora pubblico.",
    priceCents: 499,
    currency: "eur",
    type: "package",
    sessionsQty: 0,
    accessLevel: "app",
    billingInterval: "month",
    sortOrder: 0,
    active: false,
    features: ["Applicazione cliente", "Scelta personal trainer", "Creazione scheda personale"],
  },
  {
    name: "Start",
    description: "Scheda personalizzata, app e supporto messaggi per partire con metodo.",
    priceCents: 2900,
    currency: "eur",
    type: "package",
    sessionsQty: 0,
    accessLevel: "app",
    billingInterval: "month",
    sortOrder: 1,
    features: ["Scheda personalizzata", "Accesso app", "Supporto messaggi", "Aggiornamento ogni 4 settimane"],
  },
  {
    name: "Progress",
    description: "Percorso seguito con una live inclusa ogni mese.",
    priceCents: 6900,
    currency: "eur",
    type: "package",
    sessionsQty: 1,
    accessLevel: "app_live",
    billingInterval: "month",
    sortOrder: 2,
    badgeLabel: "Consigliato",
    features: ["Tutto Start", "1 live inclusa", "Check-in settimanale", "Adattamenti su carichi e recupero"],
  },
  {
    name: "Complete",
    description: "Percorso completo con tre live incluse ogni mese.",
    priceCents: 11900,
    currency: "eur",
    type: "package",
    sessionsQty: 3,
    accessLevel: "premium",
    billingInterval: "month",
    sortOrder: 3,
    features: ["Tutto Progress", "3 live incluse", "Revisione tecnica esercizi", "Strategia mensile su obiettivo e recupero"],
  },
  {
    name: "Live 1:1 extra",
    description: "Credito live acquistabile separatamente e usabile dall'area cliente.",
    priceCents: 2500,
    currency: "eur",
    type: "session_solo",
    sessionsQty: 1,
    accessLevel: "live",
    billingInterval: "one_time",
    sortOrder: 20,
    discountTiers: [
      { minQty: 4, discountPercent: 10 },
      { minQty: 8, discountPercent: 20 },
    ],
    features: ["Credito live 1:1", "Prenotazione dall'app", "Link video integrato"],
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL e ADMIN_PASSWORD sono richieste per il seed.");
  }

  // Admin
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "admin", passwordHash },
    create: { email, fullName: "Gianluigi Chiarelli", role: "admin", passwordHash },
  });
  console.log("Admin pronto:", admin.email);

  // Catalogo esercizi
  for (const ex of EXERCISE_CATALOG) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: { muscleGroup: ex.muscleGroup, defaultNotes: ex.slug },
      create: { name: ex.name, muscleGroup: ex.muscleGroup, defaultNotes: ex.slug },
    });
  }
  console.log(`Esercizi seed: ${EXERCISE_CATALOG.length}`);

  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: { ...product, active: product.active ?? true },
      create: { ...product, active: product.active ?? true },
    });
  }
  await prisma.product.updateMany({
    where: { name: { notIn: PRODUCTS.map((product) => product.name) } },
    data: { active: false },
  });
  console.log(`Pacchetti seed: ${PRODUCTS.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Seed fallito:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
