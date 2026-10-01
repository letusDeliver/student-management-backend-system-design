import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Describes the table created by db/schema.sql. Keep the two in sync until
// migrations (drizzle-kit) take over.
export const departments = pgTable("departments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  code: text().notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
