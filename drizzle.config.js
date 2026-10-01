import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Not used yet: the tables come from db/schema.sql until the migrations task.
// Do NOT run `drizzle-kit push` before students is in src/db/schema.js:
// push makes the database match the schema file, so it would drop that table.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
