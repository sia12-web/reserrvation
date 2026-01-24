import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { adminAuth } from "../middleware/auth";
import { z } from "zod";
import { alignToSlotInterval, calculateDurationMinutes, isWithinBusinessHours } from "../utils/time";
import { checkAvailability } from "../services/availability";
import { findBestTableAssignment } from "../services/tableAssignment/engine";
import { TableConfig } from "../services/tableAssignment/types";
import { generateShortId } from "../utils/shortId";
import { redlock } from "../config/redis";
import rateLimit from "express-rate-limit";

const router = Router();

const adminActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // 500 requests per 15 mins for admins (allows frequent polling)
    message: { error: "Too many admin actions, please slow down" },
});

router.use(adminActionLimiter);

// Apply auth to all admin routes
router.use(adminAuth);

// Debug ping endpoint
router.get("/ping", (_req, res) => {
    res.json({ pong: true });
});

// FORCE SEED ENDPOINT (Emergency fix for empty database)
router.get("/debug/force-seed", asyncHandler(async (_req, res) => {
    // 1. Check if tables exist
    const count = await prisma.table.count();
    if (count > 0) {
        res.json({ message: "Database already has tables. Skipping seed to prevent data loss. Use /debug/reset-seed to force wipe." });
        return;
    }

    // 2. Run seed logic (copied from seed.ts essentially)
    // T1-T15 definition
    const layout = await prisma.layout.create({
        data: {
            name: "Main Dining Room",
            isActive: true,
            adjacencyGraph: { T1: ["T2"], T2: ["T1", "T3"], T3: ["T2"], T4: ["T5"], T5: ["T4", "T6"], T6: ["T5"], T7: ["T8"], T8: ["T7"], T9: ["T10"], T10: ["T9", "T11"], T11: ["T10", "T12"], T12: ["T11", "T13"], T13: ["T12", "T14"], T14: ["T13"] },
            effectiveDate: new Date(),
        }
    });

    const tables = [
        { id: "T1", x: 280, y: 480, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T2", x: 440, y: 480, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T3", x: 600, y: 480, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T15", x: 830, y: 450, width: 120, height: 70, shape: "RECTANGLE", min: 1, max: 20, type: "STANDARD", pri: 0 },
        { id: "T7", x: 50, y: 400, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T8", x: 50, y: 300, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T6", x: 350, y: 330, width: 90, height: 90, shape: "CIRCLE", min: 4, max: 7, type: "CIRCULAR", pri: 2 },
        { id: "T5", x: 500, y: 320, width: 70, height: 110, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T4", x: 650, y: 330, width: 90, height: 90, shape: "CIRCLE", min: 4, max: 7, type: "CIRCULAR", pri: 2 },
        { id: "T14", x: 830, y: 320, width: 120, height: 70, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T9", x: 50, y: 50, width: 120, height: 150, shape: "RECTANGLE", min: 6, max: 12, type: "MERGED_FIXED", pri: 3 },
        { id: "T10", x: 220, y: 80, width: 70, height: 110, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T11", x: 350, y: 80, width: 220, height: 70, shape: "RECTANGLE", min: 8, max: 12, type: "MERGED_FIXED", pri: 3 },
        { id: "T12", x: 650, y: 80, width: 70, height: 110, shape: "RECTANGLE", min: 2, max: 4, type: "STANDARD", pri: 1 },
        { id: "T13", x: 800, y: 50, width: 120, height: 150, shape: "RECTANGLE", min: 6, max: 12, type: "MERGED_FIXED", pri: 3 },
    ];

    for (const t of tables) {
        await prisma.table.create({
            data: {
                id: t.id,
                type: t.type as any,
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height,
                shape: t.shape,
                minCapacity: t.min,
                maxCapacity: t.max,
                priorityScore: t.pri,
                layoutId: layout.id,
            }
        });
    }

    res.json({ message: "Seeded successfully! Tables T1-T15 created." });
}));

// RESET RESERVATIONS ENDPOINT
router.post("/debug/reset-reservations", asyncHandler(async (_req, res) => {
    // 1. Delete ReservationTables
    await prisma.reservationTable.deleteMany({});
    // 2. Delete Payments
    await prisma.payment.deleteMany({});
    // 3. Delete AuditLogs
    await prisma.auditLog.deleteMany({});
    // 4. Delete Reservations
    const count = await prisma.reservation.deleteMany({});

    res.json({ message: `System Reset: Cleared ${count.count} reservations and all related data.` });
}));

/**
 * GET /admin/reservations
 * List all reservations with filtering
 */
const listQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    status: z.string().optional(),
    tableId: z.string().optional(),
    phone: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().optional(),
});

router.get(
    "/reservations",
    asyncHandler(async (req, res) => {
        const query = listQuerySchema.parse(req.query);

        const where: any = {};

        if (query.from || query.to) {
            where.startTime = {};
            if (query.from) where.startTime.gte = new Date(query.from);
            if (query.to) where.startTime.lte = new Date(query.to);
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.phone) {
            where.clientPhone = { contains: query.phone };
        }

        if (query.tableId) {
            where.reservationTables = {
                some: { tableId: query.tableId },
            };
        }

        const reservations = await prisma.reservation.findMany({
            where,
            take: query.limit,
            skip: query.cursor ? 1 : 0,
            cursor: query.cursor ? { id: query.cursor } : undefined,
            orderBy: { startTime: "desc" },
            include: {
                reservationTables: true,
            },
        });

        const results = reservations.map((r: any) => ({
            ...r,
            tableIds: r.reservationTables.map((rt: any) => rt.tableId),
        }));

        res.json(results);
    })
);

/**
 * GET /admin/reservations/:id
 * Get full reservation details
 */
router.get(
    "/reservations/:id",
    asyncHandler(async (req, res) => {
        const reservationId = String(req.params.id);
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                reservationTables: true,
                payments: true,
            },
        });

        if (!reservation) {
            throw new HttpError(404, "Reservation not found");
        }

        res.json({
            ...reservation,
            tableIds: (reservation as any).reservationTables.map((rt: any) => rt.tableId),
        });
    })
);

/**
 * GET /admin/floor
 * Live floor state
 */
router.get(
    "/floor",
    asyncHandler(async (req, res) => {
        const now = new Date();
        const { from, to, date } = req.query;

        let startTime: Date;
        let endTime: Date;

        if (date) {
            // Parse the date as YYYY-MM-DD and treat it as local restaurant time (EST = UTC-5)
            // The frontend sends "2026-01-22" meaning Jan 22 in local time
            const [year, month, day] = (date as string).split('-').map(Number);
            // Create dates in EST: midnight to 11:59:59 PM
            // EST is UTC-5, so midnight EST = 05:00 UTC
            startTime = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0)); // 00:00 EST = 05:00 UTC
            endTime = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59, 999)); // 23:59:59 EST = 04:59:59 UTC next day
        } else {
            // Default "Live View": -15 mins to +4 hours
            startTime = from ? new Date(from as string) : new Date(now.getTime() - 15 * 60000);
            endTime = to ? new Date(to as string) : new Date(now.getTime() + 4 * 3600000);
        }

        const layout = await prisma.layout.findFirst({
            where: { isActive: true },
            include: { tables: true },
        });

        if (!layout) {
            throw new HttpError(500, "No active layout found");
        }

        // Find all reservations in the window
        const reservations = await prisma.reservation.findMany({
            where: {
                startTime: { lt: endTime },
                endTime: { gt: startTime },
                status: { notIn: ["CANCELLED", "NO_SHOW"] },
            },
            include: {
                reservationTables: true,
            },
        });

        const occupancyMap: Record<string, any[]> = {};

        reservations.forEach((res: any) => {
            res.reservationTables.forEach((rt: any) => {
                if (!occupancyMap[rt.tableId]) {
                    occupancyMap[rt.tableId] = [];
                }

                occupancyMap[rt.tableId].push({
                    id: res.id,
                    status: res.status,
                    shortId: res.shortId,
                    startTime: res.startTime,
                    endTime: res.endTime,
                    partySize: res.partySize,
                    clientName: res.clientName,
                    lateWarningSent: res.lateWarningSent
                });
            });
        });

        const tables = layout.tables.map((t) => {
            const tableReservations = occupancyMap[t.id] || [];

            // Determine active status: only consider non-completed/non-cancelled ones for status
            let status = "AVAILABLE";
            if (tableReservations.length > 0) {
                const isActiveNow = tableReservations.some(r =>
                    ['CONFIRMED', 'CHECKED_IN'].includes(r.status) &&
                    (
                        (new Date(r.startTime) <= now && new Date(r.endTime) >= now) ||
                        (r.status === 'CHECKED_IN' && new Date(r.endTime) >= now)
                    )
                );

                if (isActiveNow) {
                    status = "OCCUPIED";
                } else {
                    // It's not occupied now, check if there's a FUTURE reservation in the window
                    // (Ignoring COMPLETED and those in the past)
                    const isReservedFuture = tableReservations.some(r =>
                        ['CONFIRMED', 'PENDING_DEPOSIT', 'HOLD'].includes(r.status) &&
                        new Date(r.startTime) > now
                    );
                    if (isReservedFuture) {
                        status = "RESERVED";
                    }
                }
            }

            return {
                id: t.id,
                type: t.type,
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height,
                shape: t.shape,
                minCapacity: t.minCapacity,
                maxCapacity: t.maxCapacity,
                status,
                reservations: tableReservations.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            }
        });

        res.json({
            layoutId: layout.id,
            tables,
        });
    })
);

/**
 * POST /admin/reservations/:id/late-warning
 * Send running late email
 */
router.post(
    "/reservations/:id/late-warning",
    asyncHandler(async (req, res) => {
        const reservationId = String(req.params.id);

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                reservationTables: true
            }
        }) as any;

        if (!reservation) {
            throw new HttpError(404, "Reservation not found");
        }

        if (reservation.lateWarningSent) {
            throw new HttpError(409, "Warning already sent");
        }

        await prisma.$transaction(async (tx) => {
            await tx.reservation.update({
                where: { id: reservationId },
                data: { lateWarningSent: true } as any,
            });

            await (tx as any).auditLog.create({
                data: {
                    reservationId: reservationId,
                    action: "LATE_WARNING_SENT",
                    reason: "Admin prompted via system",
                },
            });
        });

        // Import sendLateWarning dynamically or ensure it is imported at top
        const { sendLateWarning } = await import("../services/email"); // Dynamic import to ensure cyclic deps/ordering works if needed, standard import preferred if at top. 
        // Better to add import at top, but for replacing block here, straightforward:

        await sendLateWarning({
            to: reservation.clientEmail || "", // Fallback if no email?
            clientName: reservation.clientName,
            partySize: reservation.partySize,
            startTime: reservation.startTime,
            shortId: reservation.shortId,
            tableIds: (reservation as any).reservationTables.map((rt: any) => rt.tableId)
        });

        res.json({ message: "Late warning email sent" });
    })
);

/**
 * POST /admin/walkins
 * Create an immediate reservation for a walk-in
 */
const walkinSchema = z.object({
    partySize: z.number().int().min(1).max(22),
    clientName: z.string().optional(),
    clientPhone: z.string().optional(),
    tableIds: z.array(z.string()).optional(),
});

router.post(
    "/walkins",
    asyncHandler(async (req, res) => {
        const payload = walkinSchema.parse(req.body);
        const now = new Date();

        // Round to nearest 15-min slot for consistency in availability checks
        const startTime = new Date(Math.ceil(now.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000));
        const durationMinutes = calculateDurationMinutes(payload.partySize);
        const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

        const activeLayout = await prisma.layout.findFirst({
            where: { isActive: true },
            include: { tables: true },
        });

        if (!activeLayout) {
            throw new HttpError(500, "Active layout not configured");
        }

        const lock = await redlock.acquire([`lock:availability:${startTime.getTime()}`], 5000);
        try {
            const unavailable = await checkAvailability(prisma, { startTime, endTime });
            const tableConfigs: TableConfig[] = activeLayout.tables.map((table) => ({
                id: table.id,
                type: (table.type as TableConfig["type"]) ?? "STANDARD",
                minCapacity: table.minCapacity ?? 1,
                maxCapacity: table.maxCapacity ?? 4,
                priorityScore: table.priorityScore ?? 0,
            }));

            let tableIds: string[] = [];

            if (payload.tableIds && payload.tableIds.length > 0) {
                // Validation for manual selection (simplified for admin, but still checking overlap)
                const conflictIds = payload.tableIds.filter((id) => unavailable.includes(id));
                if (conflictIds.length > 0) {
                    throw new HttpError(409, `Tables ${conflictIds.join(", ")} are occupied`);
                }
                tableIds = payload.tableIds;
            } else {
                // Auto-assign
                const adjacency = (activeLayout.adjacencyGraph as Record<string, string[]>) ?? {};
                const assignment = findBestTableAssignment(
                    payload.partySize,
                    tableConfigs.map(t => t.id).filter((tid) => !unavailable.includes(tid)),
                    { tables: tableConfigs, adjacency }
                );

                if (!assignment.best) {
                    throw new HttpError(409, "No available tables found for this party size");
                }
                tableIds = assignment.best.tableIds;
            }

            const shortId = generateShortId();
            const reservation = await prisma.$transaction(async (tx) => {
                const created = await tx.reservation.create({
                    data: {
                        shortId,
                        clientName: payload.clientName || "Walk-in Guest",
                        clientPhone: payload.clientPhone || "N/A",
                        partySize: payload.partySize,
                        startTime,
                        endTime,
                        status: "CHECKED_IN", // Immediate walk-in
                        depositStatus: "NOT_REQUIRED",
                        source: "KIOSK",
                    },
                });

                await tx.reservationTable.createMany({
                    data: tableIds.map((tableId, index) => ({
                        reservationId: created.id,
                        tableId,
                        layoutId: activeLayout.id,
                        isPrimary: index === 0,
                    })),
                });

                await (tx as any).auditLog.create({
                    data: {
                        reservationId: created.id,
                        action: "WALK_IN_CREATED",
                        after: { tableIds },
                        reason: "Admin created walk-in",
                    },
                });

                return created;
            });

            res.status(201).json({
                ...reservation,
                tableIds,
            });
        } finally {
            await lock.release();
        }
    })
);

/**
 * POST /admin/reservations
 * Create a manual reservation (phone/email)
 */
const createReservationSchema = z.object({
    clientName: z.string().min(1),
    clientPhone: z.string().min(1),
    partySize: z.number().int().min(1).max(22),
    startTime: z.string().datetime().or(z.string()), // Accept ISO string
    internalNotes: z.string().optional(),
});

router.post(
    "/reservations",
    asyncHandler(async (req, res) => {
        const payload = createReservationSchema.parse(req.body);
        const startTime = new Date(payload.startTime);

        // Ensure aligned to 15 mins for consistency
        const alignedStart = new Date(Math.ceil(startTime.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000));

        const durationMinutes = calculateDurationMinutes(payload.partySize);
        const endTime = new Date(alignedStart.getTime() + durationMinutes * 60_000);

        const activeLayout = await prisma.layout.findFirst({
            where: { isActive: true },
            include: { tables: true },
        });

        if (!activeLayout) {
            throw new HttpError(500, "Active layout not configured");
        }

        const lock = await redlock.acquire([`lock:availability:${alignedStart.getTime()}`], 5000);
        try {
            const unavailable = await checkAvailability(prisma, { startTime: alignedStart, endTime });
            const tableConfigs: TableConfig[] = activeLayout.tables.map((table) => ({
                id: table.id,
                type: (table.type as TableConfig["type"]) ?? "STANDARD",
                minCapacity: table.minCapacity ?? 1,
                maxCapacity: table.maxCapacity ?? 4,
                priorityScore: table.priorityScore ?? 0,
            }));

            // Auto-assign
            const adjacency = (activeLayout.adjacencyGraph as Record<string, string[]>) ?? {};
            const assignment = findBestTableAssignment(
                payload.partySize,
                tableConfigs.map(t => t.id).filter((tid) => !unavailable.includes(tid)),
                { tables: tableConfigs, adjacency }
            );

            if (!assignment.best) {
                throw new HttpError(409, "No available tables found for this party size at this time");
            }
            const tableIds = assignment.best.tableIds;

            const shortId = generateShortId();
            const reservation = await prisma.$transaction(async (tx) => {
                const created = await tx.reservation.create({
                    data: {
                        shortId,
                        clientName: payload.clientName,
                        clientPhone: payload.clientPhone,
                        partySize: payload.partySize,
                        startTime: alignedStart,
                        endTime,
                        status: "CONFIRMED", // Manual reservations are confirmed immediately
                        depositStatus: "NOT_REQUIRED", // Bypass deposit
                        source: "PHONE",
                        internalNotes: payload.internalNotes,
                    },
                });

                await tx.reservationTable.createMany({
                    data: tableIds.map((tableId, index) => ({
                        reservationId: created.id,
                        tableId,
                        layoutId: activeLayout.id,
                        isPrimary: index === 0,
                    })),
                });

                await (tx as any).auditLog.create({
                    data: {
                        reservationId: created.id,
                        action: "RESERVATION_CREATED_MANUAL",
                        after: { tableIds },
                        reason: "Admin manual creation",
                    },
                });

                return created;
            });

            res.status(201).json({
                ...reservation,
                tableIds,
            });
        } finally {
            await lock.release();
        }
    })
);

/**
 * POST /admin/reservations/:id/reassign
 * Reassign tables for an existing reservation
 */
const reassignSchema = z.object({
    newTableIds: z.array(z.string()).min(1),
    reason: z.string().min(1),
});

router.post(
    "/reservations/:id/reassign",
    asyncHandler(async (req, res) => {
        const id = req.params.id as string;
        const { newTableIds, reason } = reassignSchema.parse(req.body);

        const reservation = await prisma.reservation.findUnique({
            where: { id },
            include: { reservationTables: true },
        });

        if (!reservation) {
            throw new HttpError(404, "Reservation not found");
        }

        const activeLayout = await prisma.layout.findFirst({
            where: { isActive: true },
            include: { tables: true },
        });

        if (!activeLayout) {
            throw new HttpError(500, "Active layout not configured");
        }

        const lock = await redlock.acquire([`lock:availability:${reservation.startTime.getTime()}`], 5000);
        try {
            // 1. Check availability on new tables (excluding this reservation's current engagement)
            const unavailable = await checkAvailability(prisma, {
                startTime: reservation.startTime,
                endTime: reservation.endTime,
                excludeReservationId: id as string
            });

            const conflictIds = newTableIds.filter(tid => unavailable.includes(tid));
            if (conflictIds.length > 0) {
                throw new HttpError(409, `Tables ${conflictIds.join(", ")} are already reserved during this time.`);
            }

            // 2. Validate capacity and constraints
            const tableConfigs = activeLayout.tables.map(t => ({
                id: t.id,
                type: t.type as TableConfig["type"],
                maxCapacity: t.maxCapacity,
            }));

            const totalCapacity = newTableIds.reduce((sum, tid) => {
                const t = tableConfigs.find(tc => tc.id === tid);
                return sum + (t?.maxCapacity || 0);
            }, 0);

            if (totalCapacity < reservation.partySize) {
                throw new HttpError(400, `Selected tables (cap: ${totalCapacity}) cannot fit party of ${reservation.partySize}.`);
            }

            // Adjacency and Circular constraints
            // Simplified: Admin can override some rules but we keep basic "no circular in combos"
            const hasCircular = newTableIds.some(tid => {
                const t = tableConfigs.find(tc => tc.id === tid);
                return t?.type === "CIRCULAR" || tid === "T4" || tid === "T6";
            });

            if (hasCircular && newTableIds.length > 1) {
                throw new HttpError(400, "Circular tables cannot be combined with other tables.");
            }

            const beforeTableIds = (reservation as any).reservationTables.map((rt: any) => rt.tableId);

            await prisma.$transaction(async (tx) => {
                // Remove old table associations
                await tx.reservationTable.deleteMany({
                    where: { reservationId: id as string },
                });

                // Create new ones
                await tx.reservationTable.createMany({
                    data: newTableIds.map((tableId, index) => ({
                        reservationId: id as string,
                        tableId,
                        layoutId: activeLayout.id,
                        isPrimary: index === 0,
                    })),
                });

                await (tx as any).auditLog.create({
                    data: {
                        reservationId: id as string,
                        action: "TABLES_REASSIGNED",
                        before: { tableIds: beforeTableIds },
                        after: { tableIds: newTableIds },
                        reason,
                    },
                });
            });

            res.json({ message: "Tables reassigned successfully.", newTableIds });
        } finally {
            await lock.release();
        }
    })
);

/**
 * POST /admin/tables/:tableId/free
 * Mark a table as empty now
 */
router.post(
    "/tables/:tableId/free",
    asyncHandler(async (req, res) => {
        const tableId = req.params.tableId as string;
        const { reason } = z.object({ reason: z.string() }).parse(req.body);
        const now = new Date();

        // Find active reservation for this table
        const activeTable = await prisma.reservationTable.findFirst({
            where: {
                tableId: tableId as string,
                reservation: {
                    status: { in: ["CONFIRMED", "CHECKED_IN"] },
                    OR: [
                        { startTime: { lte: now }, endTime: { gte: now } },
                        { status: "CHECKED_IN", endTime: { gte: now } }
                    ]
                },
            },
            include: {
                reservation: true,
            },
        });

        if (!activeTable) {
            throw new HttpError(409, "Table is not currently occupied by an active reservation");
        }

        const reservation = (activeTable as any).reservation;

        await prisma.$transaction(async (tx) => {
            await tx.reservation.update({
                where: { id: reservation.id },
                data: {
                    status: "COMPLETED",
                    endTime: now,
                    freedAt: now,
                    completedAt: now,
                } as any,
            });

            await (tx as any).auditLog.create({
                data: {
                    reservationId: reservation.id,
                    tableId,
                    action: "TABLE_FREED",
                    before: { status: reservation.status, endTime: reservation.endTime },
                    after: { status: "COMPLETED", endTime: now },
                    reason,
                },
            });
        });

        res.json({ message: `Table ${tableId} freed and reservation ${reservation.shortId} marked as completed.` });
    })
);

/**
 * POST /admin/reservations/:id/cancel
 * Cancel a reservation
 */
router.post(
    "/reservations/:id/cancel",
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const reservationId = String(id);
        const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
        });

        if (!reservation) {
            throw new HttpError(404, "Reservation not found");
        }

        if (reservation.status === "CANCELLED" || reservation.status === "COMPLETED") {
            throw new HttpError(409, `Reservation is already ${reservation.status}`);
        }

        await prisma.$transaction(async (tx) => {
            await tx.reservation.update({
                where: { id: reservationId },
                data: {
                    status: "CANCELLED",
                    // We don't change times, just status
                } as any,
            });

            await (tx as any).auditLog.create({
                data: {
                    reservationId: reservationId,
                    action: "RESERVATION_CANCELLED",
                    before: { status: reservation.status },
                    after: { status: "CANCELLED" },
                    reason,
                },
            });
        });

        res.json({ message: "Reservation cancelled successfully" });
    })
);

export default router;
