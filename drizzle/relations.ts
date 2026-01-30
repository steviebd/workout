import { defineRelations } from "drizzle-orm";
import schema from "../src/lib/db/schema";

export const relations = defineRelations(schema, () => ({
}))