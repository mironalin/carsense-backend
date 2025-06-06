import {
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

import { diagnosticsTable } from "./diagnostics-schema";

export const sensorSourceEnum = pgEnum("source", [
  "obd2",
  "user_input",
  "ai_estimated",
  "simulated",
]);

export const sensorSnapshotsTable = pgTable("sensorSnapshots", {
  uuid: uuid("uuid").primaryKey().defaultRandom(),
  diagnosticUUID: uuid("diagnosticUUID")
    .notNull()
    .references(() => diagnosticsTable.uuid, { onDelete: "cascade" }),
  source: sensorSourceEnum("source").default(sensorSourceEnum.enumValues[0]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertSensorSnapshotSchema = createInsertSchema(sensorSnapshotsTable);

export const updateSensorSnapshotSchema = createUpdateSchema(sensorSnapshotsTable);

export const selectSensorSnapshotSchema = createSelectSchema(sensorSnapshotsTable);
