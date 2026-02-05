import { Router } from "express";
import { z } from "zod";
import type { ReservationSource } from "@prisma/client";
import { prisma } from "../config/prisma";
import { redlock } from "../config/redis";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { alignToSlotInterval, calculateDurationMinutes, isWithinBusinessHours, getClosingTime } from "../utils/time";
import { generateShortId } from "../utils/shortId";
import { HttpError } from "../middleware/errorHandler";
import { checkAvailability, acquireTableLocks } from "../services/availability";
import { findBestTableAssignment } from "../services/tableAssignment/engine";
import { TableConfig } from "../services/tableAssignment/types";
import { sendReservationConfirmation, sendDepositRequestEmail } from "../services/email";
import { trySmartReassignment } from "../services/reassignment";
import rateLimit from "express-rate-limit";

const router = Router();

export const reservationSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .refine((value) => !isEmojiOnly(value), "Name must not be emoji-only"),
  clientPhone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format"),
  clientEmail: z.string().email().optional().or(z.literal("")),
  partySize: z.number().int().min(1).max(50),
  startTime: z.string().datetime(),
  source: z.enum(["WEB", "KIOSK", "PHONE"]).optional(),
  tableIds: z.array(z.string()).optional(), // Manual override
  customerNotes: z.string().max(500).optional(),
});

const reservationsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 1000000, // Unlimited for testing
  message: { error: "Too many reservations created from this IP, please try again after an hour" },
});

const cancellationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 1000000, // Unlimited for testing
  message: { error: "Too many cancellation attempts, please try again later" },
});

const publicLookupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 1000000, // Unlimited for testing
  message: { error: "Too many lookup attempts" },
});

router.post(
  "/reservations",
  reservationsLimiter,
  asyncHandler(async (req, res) => {
    const payload = reservationSchema.parse(req.body);
    const startTime = new Date(payload.startTime);

    if (Number.isNaN(startTime.getTime())) {
      throw new HttpError(400, "Invalid startTime");
    }

    if (startTime <= new Date()) {
      throw new HttpError(400, "startTime must be in the future");
    }

    if (!alignToSlotInterval(startTime, 15)) {
      throw new HttpError(400, "startTime must align to 15-minute intervals");
    }

    if (!isWithinBusinessHours(startTime)) {
      throw new HttpError(400, "startTime is outside business hours");
    }

    const durationMinutes = calculateDurationMinutes(payload.partySize);
    let endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    // If it passes after 30 minutes of closing the time end should be till the closing
    const closingTime = getClosingTime(startTime);
    const limit = new Date(closingTime.getTime() + 30 * 60_000);
    if (endTime > limit) {
      endTime = closingTime;
    }

    const activeLayout = await prisma.layout.findFirst({
      where: { isActive: true },
      include: { tables: true },
    });

    if (!activeLayout) {
      throw new HttpError(500, "Active layout is not configured");
    }

    const unavailable = await checkAvailability(prisma, { startTime, endTime });
    const tableConfigs: TableConfig[] = activeLayout.tables.map((table) => ({
      id: table.id,
      type: (table.type as TableConfig["type"]) ?? "STANDARD",
      minCapacity: table.minCapacity ?? 1,
      maxCapacity: table.maxCapacity ?? 4,
      priorityScore: table.priorityScore ?? 0,
    }));

    const adjacency =
      (activeLayout.adjacencyGraph as Record<string, string[]>) ?? {};

    const available = tableConfigs
      .map((table) => table.id)
      .filter((tableId) => !unavailable.includes(tableId));

    let tableIds: string[] = [];
    let reassignmentMoves: { reservationId: string; newTableIds: string[] }[] = [];

    if (payload.tableIds && payload.tableIds.length > 0) {
      // Manual selection flow
      const requestedIds = payload.tableIds;

      // 1. Validate existence
      const unknownIds = requestedIds.filter((id) => !tableConfigs.find((t) => t.id === id));
      if (unknownIds.length > 0) {
        throw new HttpError(400, `Invalid table IDs: ${unknownIds.join(", ")}`);
      }

      // 2. Validate availability
      const conflictIds = requestedIds.filter((id) => unavailable.includes(id));
      if (conflictIds.length > 0) {
        throw new HttpError(409, `Tables ${conflictIds.join(", ")} are no longer available`);
      }

      // 3. Strict Table Selection Rules
      const circularTables = tableConfigs.filter(t => t.type === "CIRCULAR");
      const largeTables = tableConfigs.filter(t => t.type === "MERGED_FIXED" || t.maxCapacity >= 8);

      for (const id of requestedIds) {
        const table = tableConfigs.find(t => t.id === id);
        if (!table) continue;

        const isCircular = table.type === "CIRCULAR";
        const isLarge = table.type === "MERGED_FIXED" || table.maxCapacity >= 8;

        // Party 5-7 -> Priority Circular
        if (payload.partySize >= 5 && payload.partySize <= 7) {
          if (!isCircular) {
            const anyCircularAvailable = circularTables.some(ct => !unavailable.includes(ct.id));

            if (payload.partySize === 6 && isLarge && !anyCircularAvailable) {
              // Allowed as fallback
            } else if (anyCircularAvailable) {
              throw new HttpError(400, `Parties of ${payload.partySize} should use circular tables if available.`);
            }
          }
        }

        // Party 8 -> Preferred Large Tables
        // (Removing strict restriction to specific IDs, keeping it based on capacity)
        if (payload.partySize === 8 && !isLarge) {
          // Optional: warn or restrict if the restaurant wants to save small tables
        }

        // Capacity check
        if (payload.partySize > table.maxCapacity) {
          throw new HttpError(400, `Table ${id} only seats up to ${table.maxCapacity} people.`);
        }
      }

      tableIds = requestedIds;
    } else {
      // Auto-assignment flow
      const assignment = findBestTableAssignment(payload.partySize, available, {
        tables: tableConfigs,
        adjacency,
      });

      if (assignment.best) {
        tableIds = assignment.best.tableIds;
      } else {
        // Try Smart Reassignment
        const reassignment = await trySmartReassignment(prisma, {
          newPartySize: payload.partySize,
          startTime,
          endTime,
          layoutId: activeLayout.id,
          allTables: tableConfigs,
          adjacency,
        });

        if (reassignment.canReassign) {
          tableIds = reassignment.assignment.tableIds;
          reassignmentMoves = reassignment.moves;
        } else {
          throw new HttpError(409, "No available tables for the requested time");
        }
      }
    }

    const shortId = generateShortId();
    const { status, depositStatus } = deriveDepositState(payload.partySize);

    let paymentIntent: { id: string; client_secret: string | null } | null = null;

    if (status === "PENDING_DEPOSIT") {
      paymentIntent = await stripe.paymentIntents.create({
        amount: 5000,
        currency: "cad",
        metadata: {
          shortId,
          clientPhone: payload.clientPhone,
          partySize: String(payload.partySize),
          startTime: startTime.toISOString(),
        },
      });
    }

    let lock;
    try {
      lock = await acquireTableLocks(redlock, {
        tableIds,
        startTime,
        endTime,
        ttlMs: 8000,
      });
    } catch (error) {
      throw new HttpError(409, "Tables are being held, please retry");
    }

    try {
      const reservation = await prisma.$transaction(
        async (tx) => {
          // Execute reassignment moves if any
          if (reassignmentMoves.length > 0) {
            for (const move of reassignmentMoves) {
              // Delete old table assignments
              await tx.reservationTable.deleteMany({
                where: { reservationId: move.reservationId },
              });

              // Create new table assignments
              await tx.reservationTable.createMany({
                data: move.newTableIds.map((tid, idx) => ({
                  reservationId: move.reservationId,
                  tableId: tid,
                  layoutId: activeLayout.id,
                  isPrimary: idx === 0,
                })),
              });

              // Log the move
              await (tx as any).auditLog.create({
                data: {
                  reservationId: move.reservationId,
                  action: "SYSTEM_REASSIGNMENT",
                  reason: `Moved to accommodate new party of ${payload.partySize}`,
                  after: { tableIds: move.newTableIds }
                }
              });
            }
          }

          const overlap = await tx.reservationTable.findFirst({
            where: {
              tableId: { in: tableIds },
              reservation: {
                startTime: { lt: endTime },
                endTime: { gt: startTime },
                status: { in: ["HOLD", "PENDING_DEPOSIT", "CONFIRMED", "CHECKED_IN"] },
              },
            },
          });

          if (overlap) {
            throw new HttpError(409, "Tables just booked, please retry");
          }

          const created = await tx.reservation.create({
            data: {
              shortId,
              clientName: payload.clientName,
              clientPhone: payload.clientPhone,
              clientEmail: payload.clientEmail || null,
              partySize: payload.partySize,
              startTime,
              endTime,
              status,
              depositStatus,
              source: (payload.source ?? "WEB") as ReservationSource,
              customerNotes: payload.customerNotes || null,
            },
          });

          if (paymentIntent) {
            await tx.payment.create({
              data: {
                reservationId: created.id,
                provider: "STRIPE",
                providerIntentId: paymentIntent.id,
                amountCents: 5000,
                status: "PROCESSING",
                idempotencyKey: `reservation:${created.id}`,
              },
            });
          }

          await tx.reservationTable.createMany({
            data: tableIds.map((tableId, index) => ({
              reservationId: created.id,
              tableId,
              layoutId: activeLayout.id,
              isPrimary: index === 0,
            })),
          });

          return created;
        },
        { isolationLevel: "Serializable" }
      );

      if (reservation.clientEmail) {
        if (reservation.status === "CONFIRMED") {
          // Fire and forget confirmation email
          sendReservationConfirmation({
            to: reservation.clientEmail,
            clientName: reservation.clientName,
            partySize: reservation.partySize,
            startTime: reservation.startTime,
            shortId: reservation.shortId,
            tableIds,
            customerNotes: reservation.customerNotes || undefined,
          }).catch(err => console.error("Confirmation email error:", err));
        } else if (reservation.status === "PENDING_DEPOSIT") {
          // Send deposit request email for parties > 10
          sendDepositRequestEmail({
            to: reservation.clientEmail,
            clientName: reservation.clientName,
            clientPhone: reservation.clientPhone,
            partySize: reservation.partySize,
            startTime: reservation.startTime,
            shortId: reservation.shortId,
            tableIds,
          }).catch(err => console.error("Deposit request email error:", err));
        }
      }

      res.status(201).json({
        reservationId: reservation.id,
        status: reservation.status,
        tableIds,
        startTime,
        endTime,
        clientSecret: paymentIntent?.client_secret ?? null,
      });
    } finally {
      await lock.release();
    }
  })
);

function isEmojiOnly(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  return /^\p{Extended_Pictographic}+$/u.test(trimmed);
}

export function deriveDepositState(partySize: number): {
  status: "PENDING_DEPOSIT" | "CONFIRMED";
  depositStatus: "PENDING" | "NOT_REQUIRED";
} {
  if (partySize > env.depositThreshold) {
    return { status: "PENDING_DEPOSIT", depositStatus: "PENDING" };
  }

  return { status: "CONFIRMED", depositStatus: "NOT_REQUIRED" };
}

// ... existing code ...

router.get(
  "/availability",
  asyncHandler(async (req, res) => {
    const { startTime: startTimeStr, partySize: partySizeStr } = req.query;

    if (!startTimeStr || !partySizeStr) {
      throw new HttpError(400, "Missing startTime or partySize");
    }

    const startTime = new Date(String(startTimeStr));
    const partySize = Number(partySizeStr);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(partySize)) {
      throw new HttpError(400, "Invalid parameters");
    }

    const durationMinutes = calculateDurationMinutes(partySize);
    let endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    const closingTime = getClosingTime(startTime);
    const limit = new Date(closingTime.getTime() + 30 * 60_000);
    if (endTime > limit) {
      endTime = closingTime;
    }

    const unavailable = await checkAvailability(prisma, { startTime, endTime });

    res.json({
      unavailableTableIds: unavailable,
    });
  })
);

router.get(
  "/slots",
  asyncHandler(async (req, res) => {
    const { date: dateStr, partySize: partySizeStr } = req.query;

    if (!dateStr || !partySizeStr) {
      throw new HttpError(400, "Missing date or partySize");
    }

    const dayStart = new Date(String(dateStr));
    const partySize = Number(partySizeStr);

    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(partySize)) {
      throw new HttpError(400, "Invalid parameters");
    }

    // Ensure we look at the full day (00:00 to 23:59 UTC of the requested date)
    // Assuming Frontend sends ISO string for the start of the day or similar.
    const startOfDay = new Date(dayStart);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const activeLayout = await prisma.layout.findFirst({
      where: { isActive: true },
      include: { tables: true },
    });

    if (!activeLayout) {
      throw new HttpError(500, "Active layout is not configured");
    }

    // Fetch ALL reservations for this day (optimization)
    const reservations = await prisma.reservationTable.findMany({
      where: {
        reservation: {
          status: { in: ["HOLD", "PENDING_DEPOSIT", "CONFIRMED", "CHECKED_IN"] },
          // Check for overlap with the *entire day*
          endTime: { gt: startOfDay },
          startTime: { lt: endOfDay },
        },
      },
      select: {
        tableId: true,
        reservation: {
          select: { startTime: true, endTime: true },
        },
      },
    });

    const tableConfigs: TableConfig[] = activeLayout.tables.map((table) => ({
      id: table.id,
      type: (table.type as TableConfig["type"]) ?? "STANDARD",
      minCapacity: table.minCapacity ?? 1,
      maxCapacity: table.maxCapacity ?? 4,
      priorityScore: table.priorityScore ?? 0,
    }));

    const adjacency = (activeLayout.adjacencyGraph as Record<string, string[]>) ?? {};
    const durationMinutes = calculateDurationMinutes(partySize);

    // Generate candidates: every 15 minutes within business hours
    const results: { time: string; available: boolean }[] = [];

    // Scan from 11:00 to 23:00 (covering business hours)
    // We check `isWithinBusinessHours` for exact precision
    const cursor = new Date(startOfDay);
    cursor.setUTCHours(11, 0, 0, 0); // Optimization: Start checking from 11 AM 

    // Safety break after 24h
    while (cursor < endOfDay) {
      if (isWithinBusinessHours(cursor)) {
        const slotStart = new Date(cursor);
        const durationMinutes = calculateDurationMinutes(partySize);
        let slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

        const closingTime = getClosingTime(slotStart);
        const limit = new Date(closingTime.getTime() + 30 * 60_000);
        if (slotEnd > limit) {
          slotEnd = closingTime;
        }

        // Find occupied tables
        const busyTableIds = new Set<string>();
        for (const r of reservations) {
          // Check overlap: start < rEnd && end > rStart
          if (slotStart < r.reservation.endTime && slotEnd > r.reservation.startTime) {
            busyTableIds.add(r.tableId);
          }
        }

        const availableTableIds = tableConfigs
          .map(t => t.id)
          .filter(id => !busyTableIds.has(id));

        const assignment = findBestTableAssignment(partySize, availableTableIds, {
          tables: tableConfigs,
          adjacency,
        });

        results.push({
          time: slotStart.toISOString(),
          available: !!assignment.best,
        });
      }
      // Advance 15 mins
      cursor.setMinutes(cursor.getMinutes() + 15);
    }

    res.json({ slots: results });
  })
);

router.get(
  "/reservations/:shortId",
  publicLookupLimiter,
  asyncHandler(async (req, res) => {
    const shortId = req.params.shortId as string;

    const reservation = await prisma.reservation.findUnique({
      where: { shortId },
      include: {
        reservationTables: {
          select: {
            tableId: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new HttpError(404, "Reservation not found");
    }

    res.json(reservation);
  })
);

router.post(
  "/reservations/:id/cancel",
  cancellationLimiter,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const { reason } = req.body;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new HttpError(404, "Reservation not found");
    }

    if (reservation.status === "CANCELLED") {
      throw new HttpError(400, "Already cancelled");
    }

    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await tx.reservationTable.deleteMany({
        where: { reservationId: id },
      });

      await (tx as any).auditLog.create({
        data: {
          reservationId: id,
          action: "RESERVATION_CANCELLED_BY_USER",
          reason: reason || "User cancelled via management link",
        },
      });
    });

    res.json({ message: "Reservation cancelled successfully" });
  })
);

export default router;
