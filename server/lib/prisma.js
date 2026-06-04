import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Client Prisma singleton con adapter Neon (WebSocket pool, serverless-friendly).
 * Il singleton evita di creare più istanze in dev/hot-reload e tra invocazioni serverless.
 * Usa DATABASE_URL (connessione pooled Neon).
 */
const globalForPrisma = globalThis;

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}
