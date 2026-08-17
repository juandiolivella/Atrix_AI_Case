import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type WorkflowDatabase = ReturnType<typeof drizzle<typeof schema>>;

let database: WorkflowDatabase | undefined;
let configuredUrl: string | undefined;

/**
 * Creates the Neon database client only when a server route needs persistence.
 * This keeps builds and static demo routes independent from DATABASE_URL.
 */
export function getDb(databaseUrl = process.env.DATABASE_URL): WorkflowDatabase {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before using workflow persistence.");
  }

  if (!database || configuredUrl !== databaseUrl) {
    database = drizzle(neon(databaseUrl), { schema });
    configuredUrl = databaseUrl;
  }

  return database;
}
