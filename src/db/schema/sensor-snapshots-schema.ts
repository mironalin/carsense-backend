import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

import { diagnosticsTable } from "@/db/schema/diagnostics-schema";

export const sensorSourceEnum = pgEnum("source", [
  "obd2",
  "user_input",
  "ai_estimated",
  "simulated",
]);

export const sensorSnapshotsTable = pgTable("sensorSnapshots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom(),
  diagnosticId: integer("diagnosticId").references(() => diagnosticsTable.id, {
    onDelete: "cascade",
  }),
  source: sensorSourceEnum("source").default(sensorSourceEnum.enumValues[0]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertSensorSnapshot = createInsertSchema(sensorSnapshotsTable);

export const updateSensorSnapshot = createUpdateSchema(sensorSnapshotsTable);

export const selectSensorSnapshot = createSelectSchema(sensorSnapshotsTable);
