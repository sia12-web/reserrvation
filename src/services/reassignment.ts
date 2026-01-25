import { PrismaClient, Reservation } from "@prisma/client";
import { TableConfig } from "./tableAssignment/types";
import { findBestTableAssignment } from "./tableAssignment/engine";

interface ReassignmentResult {
    canReassign: boolean;
    moves: { reservationId: string; newTableIds: string[] }[];
    assignment: { tableIds: string[] };
}

export async function trySmartReassignment(
    prisma: PrismaClient,
    {
        newPartySize,
        startTime,
        endTime,
        layoutId,
        allTables,
        adjacency,
    }: {
        newPartySize: number;
        startTime: Date;
        endTime: Date;
        layoutId: string;
        allTables: TableConfig[];
        adjacency: Record<string, string[]>;
    }
): Promise<ReassignmentResult> {
    // 1. Find ALL conflicting assignments in the time window
    const conflicts = await prisma.reservationTable.findMany({
        where: {
            layoutId,
            reservation: {
                startTime: { lt: endTime },
                endTime: { gt: startTime },
                status: { in: ["HOLD", "PENDING_DEPOSIT", "CONFIRMED", "CHECKED_IN"] },
            },
        },
        include: {
            reservation: true,
        },
    });

    const occupiedTableIds = new Set(conflicts.map((c) => c.tableId));
    const reservationMap = new Map<string, { reservation: Reservation; tableIds: string[] }>();

    // Group by reservation
    for (const c of conflicts) {
        if (!reservationMap.has(c.reservationId)) {
            reservationMap.set(c.reservationId, { reservation: c.reservation, tableIds: [] });
        }
        reservationMap.get(c.reservationId)!.tableIds.push(c.tableId);
    }

    // 2. Find IDEAL assignment for the new party assuming NO conflicts (using all tables)
    const idealResult = findBestTableAssignment(newPartySize, allTables.map((t) => t.id), {
        tables: allTables,
        adjacency,
    });

    if (!idealResult.best) {
        // If we can't fit them even in an empty restaurant, we certainly can't fit them now.
        return { canReassign: false, moves: [], assignment: { tableIds: [] } };
    }

    // Try top 3 candidates to see if we can clear any of them
    const candidates = idealResult.candidates.slice(0, 3);

    for (const candidate of candidates) {
        const targetTableIds = candidate.tableIds;

        // Identify blocking reservations in this target zone
        const blockingReservations = new Set<string>();

        for (const tId of targetTableIds) {
            const conflict = conflicts.find((c) => c.tableId === tId);
            if (conflict) {
                blockingReservations.add(conflict.reservationId);
            }
        }

        if (blockingReservations.size === 0) {
            // This path is technically free, but maybe findBestTableAssignmentWithAvailability failed 
            // because of some other reason or we are using this function proactively.
            // If it's free, return it.
            return { canReassign: true, moves: [], assignment: { tableIds: targetTableIds } };
        }

        // 3. Try to move EACH blocking reservation
        const moves: { reservationId: string; newTableIds: string[] }[] = [];
        let allMoved = true;

        // Calculate the set of tables that would be free if we assume the blocking reservations are lifted
        // Initially: Free = All - Occupied
        // But we are looking for spots for the *blocking* reservations.
        // They can go to currently free spots.
        // They CANNOT go to spots occupied by *other* (non-blocking) reservations.
        // They CANNOT go to the `targetTableIds` (obviously).

        // So, `simulatedFree` = All tables EXCEPT (Occupied by non-blocking reservations) AND (targetTableIds)
        // Actually, `Occupied by non-blocking` is equivalent to `Occupied` minus `Occupied by blocking`.

        const blockingReservationIdsVal = Array.from(blockingReservations);

        // Tables occupied by OTHER reservations (that we are NOT moving)
        const immutableOccupied = new Set<string>();

        for (const [resId, data] of reservationMap.entries()) {
            if (!blockingReservations.has(resId)) {
                data.tableIds.forEach(id => immutableOccupied.add(id));
            }
        }

        // Also the new party needs `targetTableIds`, so those are effectively "occupied" by the new party
        const newPartyOccupied = new Set(targetTableIds);

        // Initial valid pool for moving:
        const baseValidPool = allTables
            .map(t => t.id)
            .filter(id => !immutableOccupied.has(id) && !newPartyOccupied.has(id));

        const simulatedFree = new Set(baseValidPool);

        for (const resId of blockingReservations) {
            const resData = reservationMap.get(resId)!;

            const moveResult = findBestTableAssignment(
                resData.reservation.partySize,
                Array.from(simulatedFree),
                { tables: allTables, adjacency }
            );

            if (moveResult.best) {
                moves.push({
                    reservationId: resId,
                    newTableIds: moveResult.best.tableIds,
                });

                // The chosen tables are now taken by this moved reservation
                for (const id of moveResult.best.tableIds) {
                    simulatedFree.delete(id);
                }
            } else {
                // Cannot move this blocking reservation
                allMoved = false;
                break;
            }
        }

        if (allMoved) {
            return {
                canReassign: true,
                moves,
                assignment: { tableIds: targetTableIds },
            };
        }
    }

    return { canReassign: false, moves: [], assignment: { tableIds: [] } };
}
