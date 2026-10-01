import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { departments } from "../db/schema.js";

export const findAll = async () => {
  return db.select().from(departments).orderBy(departments.id);
};

// Queries always resolve to an array; a miss is an empty array, so the
// destructured value is undefined.
export const findById = async (id) => {
  const [department] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, id));

  return department;
};

export const findByCode = async (code) => {
  const [department] = await db
    .select()
    .from(departments)
    .where(eq(departments.code, code));

  return department;
};

export const create = async ({ name, code }) => {
  const [department] = await db
    .insert(departments)
    .values({ name, code })
    .returning();

  return department;
};
