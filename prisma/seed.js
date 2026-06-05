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
    name: "Start Check",
    description: "Analisi obiettivo e consiglio personalizzato per capire da dove partire.",
    priceCents: 1700,
    currency: "eur",
    type: "package",
    sessionsQty: 0,
  },
  {
    name: "App Starter",
    description: "Scheda 7 giorni, accesso app e tracking base per provare il metodo.",
    priceCents: 2900,
    currency: "eur",
    type: "package",
    sessionsQty: 0,
  },
  {
    name: "App Mensile",
    description: "Scheda mensile, app, tracking e aggiornamento manuale della scheda.",
    priceCents: 5900,
    currency: "eur",
    type: "package",
    sessionsQty: 0,
  },
  {
    name: "App + Live",
    description: "App Mensile con live di gruppo settimanale inclusa.",
    priceCents: 9700,
    currency: "eur",
    type: "package",
    sessionsQty: 4,
  },
  {
    name: "Premium 1:1",
    description: "App, scheda, feedback e sessione individuale 1:1.",
    priceCents: 14900,
    currency: "eur",
    type: "package",
    sessionsQty: 1,
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
      update: { ...product, active: true },
      create: { ...product, active: true },
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
