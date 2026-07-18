import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@fpp/database";

type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDatabase = globalThis as typeof globalThis & {
  fppDatabase?: Database;
  fppSql?: postgres.Sql;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for authentication.");
  }

  return databaseUrl;
}

export function getDatabase() {
  if (!globalForDatabase.fppDatabase) {
    const sql = postgres(getDatabaseUrl(), { max: 5 });
    globalForDatabase.fppSql = sql;
    globalForDatabase.fppDatabase = drizzle(sql, { schema });
  }

  return globalForDatabase.fppDatabase;
}
