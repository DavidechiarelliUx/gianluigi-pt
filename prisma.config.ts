import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: le connection URL stanno qui (non più nello schema).
// DIRECT_URL = connessione diretta Neon (migrations).
// DATABASE_URL = connessione pooled Neon (runtime, usata dall'adapter nel codice).
// Nota: uso process.env (non env()) per non fallire se le URL non sono ancora
// configurate — validate/format/generate funzionano senza DB; migrate/seed
// richiederanno DIRECT_URL valorizzata in .env.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
