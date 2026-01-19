import { defineRelations } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

export const relations = defineRelations(schema, () => ({
}))