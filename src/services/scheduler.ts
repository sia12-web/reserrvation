
import { prisma } from "../config/prisma";
import { sendReservationReminder, sendLateWarning, sendThankYouEmail } from "./email";
import pino from "pino";

const logger = pino();

export function startScheduler() {
    logger.info("Starting reservation notification scheduler...");

    // Run every minute
    setInterval(async () => {
        try {
            await checkReminders();
            await checkLateWarnings();
            await checkThankYouEmails();
        } catch (error) {
            logger.error({ msg: "Scheduler error", error });
        }
    }, 60 * 1000);
}

async function checkReminders() {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 65 * 60 * 1000); // 5 min buffer

    const reminders = await prisma.reservation.findMany({
        where: {
            status: "CONFIRMED",
            reminderSent: false,
            startTime: {
                lte: windowEnd,
                gt: now, // Must be in future
            },
        },
        include: { reservationTables: true },
    });

    for (const res of reminders) {
        // Send email
        await sendReservationReminder({
            to: res.clientEmail || "default@example.com", // Fallback if needed, though usually required or empty
            clientName: res.clientName,
            partySize: res.partySize,
            startTime: res.startTime,
            shortId: res.shortId,
            tableIds: res.reservationTables.map((rt) => rt.tableId),
        });

        // Mark as sent
        await prisma.reservation.update({
            where: { id: res.id },
            data: { reminderSent: true },
        });
    }
}

async function checkLateWarnings() {
    const now = new Date();
    // 15 minutes past start time
    const lateThreshold = new Date(now.getTime() - 15 * 60 * 1000);

    const lateReservations = await prisma.reservation.findMany({
        where: {
            status: "CONFIRMED", // still confirmed means they haven't checked in
            lateWarningSent: false,
            startTime: {
                lt: lateThreshold, // Started more than 15 mins ago
                gt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // sanity check: strictly "today's" late ones, avoid spamming old data
            },
        },
    });

    for (const res of lateReservations) {
        // Send email
        await sendLateWarning({
            to: res.clientEmail || "default@example.com",
            clientName: res.clientName,
            partySize: res.partySize,
            startTime: res.startTime,
            shortId: res.shortId,
            tableIds: [], // Not needed for late warning usually, or fetch if needed
        });

        // Mark as sent
        await prisma.reservation.update({
            where: { id: res.id },
            data: { lateWarningSent: true },
        });
    }
}

async function checkThankYouEmails() {
    const now = new Date();
    // Send 30 mins after end time
    const endWindow = new Date(now.getTime() - 30 * 60 * 1000);

    const endedReservations = await prisma.reservation.findMany({
        where: {
            status: { in: ["COMPLETED", "CHECKED_IN"] },
            thankYouSent: false,
            endTime: {
                lt: endWindow,
                gt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
            },
        },
    });

    for (const res of endedReservations) {
        if (!res.clientEmail) {
            await prisma.reservation.update({
                where: { id: res.id },
                data: { thankYouSent: true },
            });
            continue;
        }

        await sendThankYouEmail({
            to: res.clientEmail,
            clientName: res.clientName,
            shortId: res.shortId,
        });

        await prisma.reservation.update({
            where: { id: res.id },
            data: { thankYouSent: true },
        });
    }
}
