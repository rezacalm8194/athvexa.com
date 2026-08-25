import { PrismaClient } from "@prisma/client";

// Prevent hot-reload from spawning a new PrismaClient on every save in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function assertDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (databaseUrl.startsWith("file:")) {
    throw new Error(
      "Athvexa requires PostgreSQL. Set DATABASE_URL to a Postgres connection string (see .env.example). SQLite is not supported."
    );
  }
}

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Startup check only — never creates tables or runs migrations.
 * Schema changes belong in `prisma migrate` / `db push`, not the request path.
 */
export function ensureDatabase() {
  assertDatabaseUrl();
  return Promise.resolve();
}
