import { transporter } from "../config/mail";
import { env } from "../config/env";
import pino from "pino";

const logger = pino();

export interface ReservationEmailParams {
    to: string;
    clientName: string;
    partySize: number;
    startTime: Date;
    shortId: string;
    tableIds: string[];
    customerNotes?: string;
}

export async function sendReservationConfirmation(params: ReservationEmailParams) {
    const { to, clientName, partySize, startTime, shortId, tableIds, customerNotes } = params;

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
}
