import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

declare global { var __sql: ReturnType<typeof postgres> | undefined; }
const sql = global.__sql ?? postgres(process.env.DATABASE_URL!, { max: 5 });
if (process.env.NODE_ENV !== "production") global.__sql = sql;
export const db = drizzle(sql, { schema });
