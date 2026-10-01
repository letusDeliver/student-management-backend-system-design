import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

// An idle connection can die at any time (Postgres restart, network drop).
// The pool emits "error" for it; without a listener, Node treats that as an
// uncaught exception and the process exits. The pool removes the dead
// connection itself and opens a new one on the next query.
pool.on("error", (error) => {
  console.error("Idle database connection lost:", error.message);
});

export const db = drizzle(pool);
