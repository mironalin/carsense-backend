import {
  doublePrecision,
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

import { serviceWorkshopsTable } from "./service-workshops-schema";
import { vehiclesTable } from "./vehicles-schema";

export const serviceTypeEnum = pgEnum("serviceType", [
  "oil_change",
  "brake_replacement",
  "engine_diagnostics",
  "tire_rotation",
  "battery_replacement",
  "coolant_flush",
  "transmission_service",
  "general_inspection",
  "timing_belt_replacement",
  "timing_chain_replacement",
  "spark_plug_replacement",
  "air_filter_replacement",
  "fuel_filter_replacement",
  "ac_service",
  "suspension_inspection",
  "wheel_alignment",
  "exhaust_repair",
  "clutch_replacement",
  "software_update",
  "engine_overhaul",
]);

export const maintenanceLogTable = pgTable("maintenanceLog", {
  uuid: uuid("uuid").primaryKey().defaultRandom(),
  vehicleUUID: uuid("vehicleUUID")
    .notNull()
    .references(() => vehiclesTable.uuid, { onDelete: "cascade" }),
  serviceWorkshopUUID: uuid("serviceWorkshopUUID")
    .notNull()
    .references(() => serviceWorkshopsTable.uuid, { onDelete: "cascade" }),
  customServiceWorkshopName: text("customServiceWorkshopName"),
  serviceDate: timestamp("serviceDate").notNull(),
  serviceType: serviceTypeEnum("serviceType").notNull(),
  cost: doublePrecision("cost"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertMaintenanceLogSchema
  = createInsertSchema(maintenanceLogTable);

export const selectMaintenanceLogSchema
  = createSelectSchema(maintenanceLogTable);

export const updateMaintenanceLogSchema
  = createUpdateSchema(maintenanceLogTable);
