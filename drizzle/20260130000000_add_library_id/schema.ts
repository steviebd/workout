import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const exercises = sqliteTable("exercises", {
  libraryId: text("library_id"),
});
