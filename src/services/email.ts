import { transporter } from "../config/mail";
import { env } from "../config/env";
import { sendTelegramMessage, formatReservationNotification } from "../config/telegram";
import pino from "pino";

const logger = pino();

export interface ReservationEmailParams {
    to: string;
    clientName: string;
    clientPhone?: string;
    partySize: number;
    startTime: Date;
    shortId: string;
    tableIds: string[];
    customerNotes?: string;
}

export async function sendReservationConfirmation(params: ReservationEmailParams) {
    const { to, clientName, clientPhone, partySize, startTime, shortId, tableIds, customerNotes } = params;

    const dateStr = startTime.toLocaleString("en-CA", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "America/Montreal",
    });

    // Use a user-friendly link (assuming frontend is at port 5173 locally or configured via env)
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const manageLink = `${frontendBaseUrl}/reservations/manage/${shortId}`;

    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h1 style="color: #1e293b; margin-bottom: 24px; text-align: center;">Reservation Confirmed!</h1>
        <p style="color: #475569; font-size: 16px;">Hi <strong>${clientName}</strong>,</p>
        <p style="color: #475569; font-size: 16px;">We are delighted to confirm your reservation. We look forward to serving you!</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <ul style="list-style: none; padding: 0; margin: 0; color: #334155; font-size: 15px;">
                <li style="margin-bottom: 12px;"><strong>📅 Date:</strong> ${dateStr}</li>
                <li style="margin-bottom: 12px;"><strong>👥 Party Size:</strong> ${partySize} guests</li>
                <li style="margin-bottom: 12px;"><strong>🆔 Confirmation Code:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; rounded: 4px;">${shortId}</span></li>
                <li style="margin-bottom: 12px;"><strong>🍽️ Tables:</strong> ${tableIds.join(", ")}</li>
                ${customerNotes ? `<li style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 12px;"><strong>📝 Special Request:</strong> ${customerNotes}</li>` : ""}
            </ul>
        </div>

        <div style="text-align: center; margin-top: 32px;">
            <a href="${manageLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Manage or Cancel Reservation</a>
            <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">You can use the link above to update your guest count or cancel your booking.</p>
        </div>
    </div>
  `;

    try {
        const info = await transporter.sendMail({
            from: env.mailFrom,
            to: env.mailFrom, // For now, send to self/admin so it appears in MailHog reliably
            cc: to, // Optional: CC the client so we see intent
            subject: `Reservation Confirmed - ${shortId}`,
            html,
        });

        logger.info({ msg: "Email sent", messageId: info.messageId, to });
    } catch (error) {
        logger.error({ msg: "Failed to send email", error, to });
    }

    // Send Telegram notification to the owner/staff group
    if (env.telegramChatId) {
        const telegramMsg = formatReservationNotification({
            type: "NEW",
            clientName,
            clientPhone: clientPhone || "N/A",
            partySize,
            startTime,
            shortId,
            tableIds,
            customerNotes,
        });
        sendTelegramMessage({ chatId: env.telegramChatId, text: telegramMsg }).catch((err) =>
            logger.error({ msg: "Telegram notification failed", error: err })
        );
    }
}

export async function sendReservationReminder(params: ReservationEmailParams) {
    const { to, clientName, partySize, startTime, shortId, tableIds } = params;

    const dateStr = new Date(startTime).toLocaleString("en-CA", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "America/Montreal",
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const manageLink = `${frontendBaseUrl}/reservations/manage/${shortId}`;

    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h1 style="color: #0f172a; margin-bottom: 24px; text-align: center;">⏰ Upcoming Reservation</h1>
        <p style="color: #475569; font-size: 16px;">Hi <strong>${clientName}</strong>,</p>
        <p style="color: #475569; font-size: 16px;">Just a friendly reminder that your reservation is in <strong>1 hour</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <ul style="list-style: none; padding: 0; margin: 0; color: #334155; font-size: 15px;">
                <li style="margin-bottom: 12px;"><strong>📅 When:</strong> ${dateStr}</li>
                <li style="margin-bottom: 12px;"><strong>👥 Party:</strong> ${partySize} guests</li>
                <li style="margin-bottom: 12px;"><strong>🆔 Code:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; rounded: 4px;">${shortId}</span></li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 32px;">
            <a href="${manageLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Details & Directions</a>
        </div>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: env.mailFrom,
            to: env.mailFrom,
            cc: to,
            subject: `Reservation Reminder - ${shortId}`,
            html,
        });
        logger.info({ msg: "Reminder email sent", shortId, to });
    } catch (error) {
        logger.error({ msg: "Failed to send reminder email", error, shortId });
    }
}

export async function sendLateWarning(params: ReservationEmailParams) {
    const { to, clientName, shortId, startTime } = params;

    const dateStr = new Date(startTime).toLocaleString("en-CA", {
        timeStyle: "short",
        timeZone: "America/Montreal",
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const manageLink = `${frontendBaseUrl}/reservations/manage/${shortId}`;

    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px; background-color: #fffafa;">
        <h1 style="color: #991b1b; margin-bottom: 24px; text-align: center;">Running Late?</h1>
        <p style="color: #475569; font-size: 16px;">Hi <strong>${clientName}</strong>,</p>
        <p style="color: #475569; font-size: 16px;">We noticed you haven't arrived for your <strong>${dateStr}</strong> reservation yet (15 minutes ago).</p>
        <p style="color: #475569; font-size: 16px;">Please arrive soon or call us, otherwise we may need to release your table.</p>
        
        <div style="text-align: center; margin-top: 32px;">
            <a href="tel:+15550199" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Call Restaurant</a>
            <div style="margin-top: 12px;">
                <a href="${manageLink}" style="color: #64748b; text-decoration: underline;">Manage Booking</a>
            </div>
        </div>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: env.mailFrom,
            to: env.mailFrom,
            cc: to,
            subject: `Urgent: Reservation Status - ${shortId}`,
            html,
        });
        logger.info({ msg: "Late warning email sent", shortId, to });
    } catch (error) {
        logger.error({ msg: "Failed to send late warning email", error, shortId });
    }

    // Send URGENT Telegram notification for late arrivals
    if (env.telegramChatId) {
        const telegramMsg = formatReservationNotification({
            type: "LATE",
            clientName,
            clientPhone: (params as any).clientPhone || "N/A",
            partySize: (params as any).partySize || 0,
            startTime,
            shortId,
            tableIds: (params as any).tableIds || [],
        });
        sendTelegramMessage({ chatId: env.telegramChatId, text: telegramMsg }).catch((err) =>
            logger.error({ msg: "Telegram late warning failed", error: err })
        );
    }
}

export async function sendThankYouEmail(params: { to: string; clientName: string; shortId: string }) {
    const { to, clientName, shortId } = params;

    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h1 style="color: #1e293b; margin-bottom: 24px; text-align: center;">Thank You for Visiting!</h1>
        <p style="color: #475569; font-size: 16px;">Hi <strong>${clientName}</strong>,</p>
        <p style="color: #475569; font-size: 16px;">It was a pleasure having you at <strong>Diba Restaurant</strong> today. We hope you enjoyed your meal and our service!</p>
        <p style="color: #475569; font-size: 16px;">If you have a moment, we would greatly appreciate it if you could share your experience by leaving us a review. Your feedback helps us grow and continue providing the best experience for our guests.</p>
        
        <div style="text-align: center; margin-top: 32px; padding: 24px; background-color: #f8fafc; border-radius: 12px;">
            <p style="margin-bottom: 20px; color: #334155; font-weight: bold;">How did we do?</p>
            <a href="${env.reviewLink}" style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Leave a Review</a>
        </div>

        <p style="margin-top: 32px; text-align: center; color: #94a3b8; font-size: 14px;">We look forward to seeing you again soon!</p>
        <p style="text-align: center; color: #94a3b8; font-size: 12px;">Reservation ID: ${shortId}</p>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: env.mailFrom,
            to: env.mailFrom,
            cc: to,
            subject: `Thank you for dining with us! - ${clientName}`,
            html,
        });
        logger.info({ msg: "Thank you email sent", shortId, to });
    } catch (error) {
        logger.error({ msg: "Failed to send thank you email", error, shortId });
    }
}

export async function sendDepositRequestEmail(params: ReservationEmailParams) {
    const { to, clientName, partySize, startTime, shortId, tableIds } = params;

    const dateStr = startTime.toLocaleString("en-CA", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "America/Montreal",
    });

    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h1 style="color: #1e293b; margin-bottom: 24px; text-align: center;">Deposit Required</h1>
        <p style="color: #475569; font-size: 16px;">Hi <strong>${clientName}</strong>,</p>
        <p style="color: #475569; font-size: 16px;">Thank you for your reservation request for <strong>${partySize} guests</strong> on <strong>${dateStr}</strong>.</p>
        <p style="color: #475569; font-size: 16px;">For parties larger than 10, we require a <strong>$50 security deposit</strong> to confirm the booking. This deposit will be credited toward your final bill.</p>
        
        <div style="background-color: #fffbeb; padding: 20px; border: 1px solid #fef3c7; border-radius: 8px; margin: 24px 0;">
            <p style="color: #92400e; margin: 0; font-weight: bold; text-align: center;">Your reservation is currently on HOLD.</p>
            <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px; text-align: center;">A member of our team will contact you shortly with a payment link to secure your table.</p>
        </div>

        <p style="color: #475569; font-size: 14px;">Confirmation Code: <strong>${shortId}</strong></p>
        <p style="margin-top: 32px; text-align: center; color: #94a3b8; font-size: 14px;">If you have any questions, please reply to this email or call us.</p>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: env.mailFrom,
            to: env.mailFrom,
            cc: to,
            subject: `Action Required: Deposit for Reservation ${shortId}`,
            html,
        });
        logger.info({ msg: "Deposit request email sent", shortId, to });
    } catch (error) {
        logger.error({ msg: "Failed to send deposit request email", error, shortId });
    }

    // Send Telegram notification for pending deposit (Large Party)
    if (env.telegramChatId) {
        const telegramMsg = formatReservationNotification({
            type: "DEPOSIT_REQUIRED",
            clientName,
            clientPhone: params.clientPhone || "N/A",
            partySize,
            startTime,
            shortId,
            tableIds,
        });
        sendTelegramMessage({ chatId: env.telegramChatId, text: telegramMsg }).catch((err) =>
            logger.error({ msg: "Telegram deposit notification failed", error: err })
        );
    }
}
