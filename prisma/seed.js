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
    name: "Sessione live 1:1",
    description: "Una sessione individuale online con Gianluigi.",
    priceCents: 4500,
    currency: "eur",
    type: "session_solo",
    sessionsQty: 1,
  },
  {
    name: "Live di gruppo",
    description: "Accesso a una sessione live di gruppo.",
    priceCents: 1500,
    currency: "eur",
    type: "session_group",
    sessionsQty: 1,
  },
  {
    name: "Pacchetto 4 sessioni",
    description: "Quattro sessioni live 1:1 per lavorare con continuita.",
    priceCents: 16000,
    currency: "eur",
    type: "package",
    sessionsQty: 4,
  },
  {
    name: "Pacchetto 10 sessioni",
    description: "Percorso completo da dieci sessioni live 1:1.",
    priceCents: 35000,
    currency: "eur",
    type: "package",
    sessionsQty: 10,
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
  console.log(`Pacchetti seed: ${PRODUCTS.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Seed fallito:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
