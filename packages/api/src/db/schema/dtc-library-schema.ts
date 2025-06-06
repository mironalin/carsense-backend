import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export const severityEnum = pgEnum("severity", ["low", "medium", "high"]);

export const DTCLibraryTable = pgTable("dtcLibrary", {
  uuid: uuid("uuid").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  severity: severityEnum("severity").notNull(),
  affectedSystem: text("affectedSystem"),
  category: text("category"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertDTCLibrarySchema = createInsertSchema(DTCLibraryTable);

export const updateDTCLibrarySchema = createUpdateSchema(DTCLibraryTable);

export const selectDTCLibrarySchema = createSelectSchema(DTCLibraryTable);
