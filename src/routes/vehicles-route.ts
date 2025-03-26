import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator as zValidator } from "hono-openapi/zod";

import type { AppBindings } from "@/lib/types";

import { db } from "@/db";
import {
  insertOwnershipTransferSchema,
  ownershipTransfersTable,
} from "@/db/schema/ownership-transfers";
import {
  insertVehicleSchema,
  selectVehicleSchema,
  updateVehicleSchema,
  vehiclesTable,
} from "@/db/schema/vehicles-schema";
import { getSessionAndUser } from "@/middleware/get-session-and-user";
import { unauthorizedResponseObject, vehicleNotFoundResponseObject } from "@/zod/z-api-responses";
import {
  zVehicleDeleteResponseSchema,
  zVehicleGetResponseSchema,
  zVehicleInsertSchema,
  zVehicleRestoreResponseSchema,
  zVehiclesListResponseSchema,
  zVehicleUpdateResponseSchema,
} from "@/zod/z-vehicles";

export const vehiclesRoute = new Hono<AppBindings>()
  .use(getSessionAndUser)
  .get(
    "/",
    describeRoute({
      tags: ["Vehicles"],
      description:
        "Get all vehicles owned by the user if the user has the role of 'user', otherwise get all vehicles if the user has the role of 'admin'",
      summary: "Get all vehicles",
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(zVehiclesListResponseSchema),
            },
          },
        },
        401: unauthorizedResponseObject,
      },
    }),
    async (c) => {
      const user = c.get("user");
      const logger = c.get("logger");

      if (!user) {
        logger.warn("Unauthorized attempt to access vehicles list");
        return c.json({ error: "Unauthorized" }, 401);
      }

      logger.info({ userId: user.id, role: user.role }, "Fetching vehicles list");

      const vehicles = await db
        .select()
        .from(vehiclesTable)
        .where(
          and(
            user.role === "user"
              ? eq(vehiclesTable.ownerId, user.id)
              : undefined,
            isNull(vehiclesTable.deletedAt),
          ),
        );

      logger.info({ count: vehicles.length }, "Vehicles fetched successfully");
      return c.json(vehicles);
    },
  )
  .post(
    "/",
    describeRoute({
      tags: ["Vehicles"],
      description: "Create a new vehicle for the authenticated user",
      summary: "Create a new vehicle",
      responses: {
        201: {
          description: "Created",
          content: {
            "application/json": {
              schema: resolver(selectVehicleSchema),
            },
          },
        },
        401: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string", example: "Unauthorized" },
                },
                required: ["error"],
              },
            },
          },
        },
      },
    }),
    zValidator("json", zVehicleInsertSchema),
    async (c) => {
      const user = c.get("user");
      const logger = c.get("logger");

      if (!user) {
        logger.warn("Unauthorized attempt to create a vehicle");
        return c.json({ error: "Unauthorized" }, 401);
      }

      const vehicle = c.req.valid("json");
      logger.info({ userId: user.id, vin: vehicle.vin }, "Attempting to create a vehicle");

      const existing = await db
        .select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.vin, vehicle.vin));

      const deletedVehicle = existing.find(v => v.deletedAt !== null);

      if (deletedVehicle) {
        logger.info({ vehicleId: deletedVehicle.id, vin: vehicle.vin }, "Found deleted vehicle with matching VIN");

        if (deletedVehicle.ownerId !== user.id) {
          // Log ownership transfer
          const ownershipTransfer = insertOwnershipTransferSchema.parse({
            vehicleId: deletedVehicle.id,
            fromUserId: deletedVehicle.ownerId,
            toUserId: user.id,
            transferredAt: new Date(),
          });

          await db.insert(ownershipTransfersTable).values(ownershipTransfer);

          logger.info({
            vehicleId: deletedVehicle.id,
            fromUserId: deletedVehicle.ownerId,
            toUserId: user.id,
          }, "Ownership transfer logged");
        }

        // Reactivate and reassign
        const updatedVehicle = updateVehicleSchema.parse({
          ...deletedVehicle,
          ownerId: user.id,
          deletedAt: null,
          updatedAt: new Date(),
        });

        const updated = await db
          .update(vehiclesTable)
          .set(updatedVehicle)
          .where(eq(vehiclesTable.id, deletedVehicle.id))
          .returning()
          .then(res => res[0]);

        logger.info({ vehicleId: updated.id, vin: updated.vin }, "Vehicle restored successfully");
        return c.json({ vehicle: updated, restored: true });
      }

      const validatedVehicle = insertVehicleSchema.parse({
        ...vehicle,
        ownerId: user.id,
      });

      const created = await db
        .insert(vehiclesTable)
        .values(validatedVehicle)
        .returning()
        .then(res => res[0]);

      c.status(201);

      logger.info({ vehicleId: created.id, vin: created.vin }, "Vehicle created successfully");
      return c.json({ vehicle: created, created: true });
    },
  )
  .get(
    "/:vehicleUUID",
    describeRoute({
      tags: ["Vehicles"],
      description: "Get a vehicle by UUID",
      summary: "Get a vehicle by UUID",
      responses: {
        200: {
          description: "Vehicle found",
          content: {
            "application/json": {
              schema: resolver(zVehicleGetResponseSchema),
            },
          },
        },
        401: unauthorizedResponseObject,
        404: vehicleNotFoundResponseObject,
      },
    }),
    async (c) => {
      const user = c.get("user");
      const logger = c.get("logger");
      const uuid = c.req.param("vehicleUUID");

      if (!user) {
        logger.warn({ vehicleUUID: uuid }, "Unauthorized attempt to get vehicle details");
        return c.json({ error: "Unauthorized" }, 401);
      }

      logger.info({ userId: user.id, vehicleUUID: uuid }, "Fetching vehicle by UUID");

      const vehicle = await db
        .select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.uuid, uuid))
        .then(res => res[0]);

      if (!vehicle) {
        logger.warn({ vehicleUUID: uuid }, "Vehicle not found");
        return c.json({ error: "Vehicle not found" }, 404);
      }

      if (user.role !== "admin" && vehicle.ownerId !== user.id) {
        logger.warn({
          userId: user.id,
          vehicleId: vehicle.id,
          vehicleOwnerId: vehicle.ownerId,
        }, "User not authorized to view this vehicle");
        return c.json({ error: "Unauthorized" }, 401);
      }

      logger.info({ vehicleId: vehicle.id, vin: vehicle.vin }, "Vehicle fetched successfully");
      return c.json(vehicle);
    },
  )
  .patch(
    "/:vehicleUUID",
    describeRoute({
      tags: ["Vehicles"],
      description: "Update a vehicle by UUID",
      summary: "Update a vehicle by UUID",
      responses: {
        200: {
          description: "Vehicle updated",
          content: {
            "application/json": {
              schema: resolver(zVehicleUpdateResponseSchema),
            },
          },
        },
        401: unauthorizedResponseObject,
        404: vehicleNotFoundResponseObject,
      },
    }),
    zValidator(
      "json",
      updateVehicleSchema
        .omit({
          uuid: true,
          createdAt: true,
          updatedAt: true,
        })
        .partial(),
    ),
    async (c) => {
      const user = c.get("user");
      const logger = c.get("logger");

      if (!user) {
        logger.warn("Unauthorized attempt to update a vehicle");
        return c.json({ error: "Unauthorized" }, 401);
      }

      const vehicleBody = c.req.valid("json");
      const vehicleUUID = c.req.param("vehicleUUID");

      logger.info({ userId: user.id, vehicleUUID }, "Attempting to update vehicle");

      const vehicle = await db
        .select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.uuid, vehicleUUID))
        .then(res => res[0]);

      if (!vehicle) {
        logger.warn({ vehicleUUID }, "Vehicle not found for update");
        return c.json({ error: "Vehicle not found" }, 404);
      }

      if (user.role !== "admin" && vehicle.ownerId !== user.id) {
        logger.warn({
          userId: user.id,
          vehicleId: vehicle.id,
          vehicleOwnerId: vehicle.ownerId,
        }, "User not authorized to update this vehicle");
        return c.json({ error: "Unauthorized" }, 401);
      }

      // If ownerId is being updated, log transfer
      if (vehicleBody.ownerId && vehicleBody.ownerId !== vehicle.ownerId) {
        if (user.role !== "admin") {
          logger.warn({
            userId: user.id,
            vehicleId: vehicle.id,
            attemptedOwnerId: vehicleBody.ownerId,
          }, "Non-admin user attempted ownership transfer");
          return c.json({ error: "Only admins can transfer ownership" }, 403);
        }

        const ownershipTransfer = insertOwnershipTransferSchema.parse({
          vin: vehicle.vin,
          fromUserId: vehicle.ownerId,
          toUserId: vehicleBody.ownerId,
          transferredAt: new Date(),
        });

        await db.insert(ownershipTransfersTable).values(ownershipTransfer);
        logger.info({
          vehicleId: vehicle.id,
          fromUserId: vehicle.ownerId,
          toUserId: vehicleBody.ownerId,
        }, "Vehicle ownership transferred");
      }

      const validatedVehicleUpdate = updateVehicleSchema.parse({
        ...vehicleBody,
      });

      logger.debug({ vehicleId: vehicle.id, update: validatedVehicleUpdate }, "Validated vehicle update");

      const updatedVehicle = await db
        .update(vehiclesTable)
        .set(validatedVehicleUpdate)
        .where(eq(vehiclesTable.uuid, vehicleUUID))
        .returning()
        .then(res => res[0]);

      logger.info({ vehicleId: updatedVehicle.id }, "Vehicle updated successfully");
      return c.json(updatedVehicle);
    },
  )
  .delete(
    "/:vehicleUUID",
    describeRoute({
      description: "Delete a vehicle",
      summary: "Delete a vehicle",
      tags: ["Vehicles"],
      responses: {
        200: {
          description: "Vehicle deleted",
          content: {
            "application/json": {
              schema: resolver(zVehicleDeleteResponseSchema),
            },
          },
        },
        401: unauthorizedResponseObject,
        404: vehicleNotFoundResponseObject,
      },
    }),
    async (c) => {
      const user = c.get("user");
      const logger = c.get("logger");

      if (!user) {
        logger.warn("Unauthorized attempt to delete a vehicle");
        return c.json({ error: "Unauthorized" }, 401);
      }

      const vehicleUUID = c.req.param("vehicleUUID");
      logger.info({ userId: user.id, vehicleUUID }, "Attempting to delete vehicle");

      const vehicle = await db
        .select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.uuid, vehicleUUID))
        .then(res => res[0]);

      if (!vehicle) {
        logger.warn({ vehicleUUID }, "Vehicle not found for deletion");
        return c.json({ error: "Vehicle not found" }, 404);
      }

      if (vehicle.ownerId !== user.id) {
        logger.warn({
          userId: user.id,
          vehicleId: vehicle.id,
          vehicleOwnerId: vehicle.ownerId,
        }, "User not authorized to delete this vehicle");
        return c.json({ error: "Unauthorized" }, 401);
      }

      const softDeleteVehicle = updateVehicleSchema.parse({
        deletedAt: new Date(),
      });

      await db.update(vehiclesTable).set(softDeleteVehicle);

      logger.info({ vehicleId: vehicle.id, vin: vehicle.vin }, "Vehicle soft deleted successfully");
      return c.json({
        message: "Vehicle soft deleted successfully",
        vehicleUUID: vehicle.uuid,
      });
    },
  )
  .post("/:vehicleUUID/restore", describeRoute({
    tags: ["Vehicles"],
    description: "Restore a vehicle",
    summary: "Restore a vehicle",
    responses: {
      200: {
        description: "Vehicle restored",
        content: {
          "application/json": {
            schema: resolver(zVehicleRestoreResponseSchema),
          },
        },
      },
      401: unauthorizedResponseObject,
      404: vehicleNotFoundResponseObject,
    },
  }), async (c) => {
    const user = c.get("user");
    const logger = c.get("logger");
    const vehicleUUID = c.req.param("vehicleUUID");

    if (!user) {
      logger.warn({ vehicleUUID }, "Unauthorized attempt to restore a vehicle");
      return c.json({ error: "Unauthorized" }, 401);
    }

    logger.info({ userId: user.id, vehicleUUID }, "Attempting to restore vehicle");

    const vehicle = await db.select().from(vehiclesTable).where(eq(vehiclesTable.uuid, vehicleUUID)).then(res => res[0]);

    if (!vehicle) {
      logger.warn({ vehicleUUID }, "Vehicle not found for restoration");
      return c.json({ error: "Vehicle not found" }, 404);
    }

    if (vehicle.ownerId !== user.id) {
      logger.warn({
        userId: user.id,
        vehicleId: vehicle.id,
        vehicleOwnerId: vehicle.ownerId,
      }, "User not authorized to restore this vehicle");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const restoredVehicleUpdate = updateVehicleSchema.parse({
      deletedAt: null,
      updatedAt: new Date(),
    });

    const restoredVehicle = await db.update(vehiclesTable).set(restoredVehicleUpdate).where(eq(vehiclesTable.uuid, vehicleUUID)).returning().then(res => res[0]);

    logger.info({ vehicleId: restoredVehicle.id, vin: restoredVehicle.vin }, "Vehicle restored successfully");
    return c.json({ vehicle: restoredVehicle, restored: true });
  });
