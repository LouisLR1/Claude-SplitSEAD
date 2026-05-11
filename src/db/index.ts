import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Fall back to a placeholder at build time so the module initialises without
// DATABASE_URL. The placeholder is never used at request time because
// Next.js serverless functions re-evaluate module-level code on each cold
// start, at which point the real env var is available.
const sql = neon(
  process.env.DATABASE_URL ?? "postgresql://build-placeholder:x@localhost/x"
);

export const db = drizzle(sql, { schema });
