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

const EXERCISES = [
  { name: "Panca piana", muscleGroup: "Petto" },
  { name: "Spinte con manubri", muscleGroup: "Petto" },
  { name: "Croci ai cavi", muscleGroup: "Petto" },
  { name: "Trazioni", muscleGroup: "Dorso" },
  { name: "Rematore con bilanciere", muscleGroup: "Dorso" },
  { name: "Lat machine", muscleGroup: "Dorso" },
  { name: "Squat", muscleGroup: "Gambe" },
  { name: "Stacco da terra", muscleGroup: "Gambe" },
  { name: "Pressa", muscleGroup: "Gambe" },
  { name: "Affondi", muscleGroup: "Gambe" },
  { name: "Lento avanti", muscleGroup: "Spalle" },
  { name: "Alzate laterali", muscleGroup: "Spalle" },
  { name: "Curl con bilanciere", muscleGroup: "Bicipiti" },
  { name: "French press", muscleGroup: "Tricipiti" },
  { name: "Plank", muscleGroup: "Core" },
  { name: "Crunch", muscleGroup: "Core" },
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
  for (const ex of EXERCISES) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: { muscleGroup: ex.muscleGroup },
      create: ex,
    });
  }
  console.log(`Esercizi seed: ${EXERCISES.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Seed fallito:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
