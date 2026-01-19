import { Router } from "express";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import { prisma } from "../config/prisma";

const router = Router();

router.post("/stripe", async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!signature || Array.isArray(signature)) {
    res.status(400).send("Missing Stripe signature");
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      env.stripeWebhookSecret
    );
  } catch (error) {
    res.status(400).send("Invalid Stripe signature");
    return;
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object as { id: string; metadata?: Record<string, string> };
      const shortId = intent.metadata?.shortId;

      const payment = await prisma.payment.findFirst({
        where: { providerIntentId: intent.id },
      });

      const reservationId = payment?.reservationId;

      if (reservationId || shortId) {
        const reservation = await prisma.reservation.findFirst({
          where: reservationId ? { id: reservationId } : { shortId },
          include: { reservationTables: { select: { tableId: true } } },
        });

        if (reservation) {
          const tableIds = reservation.reservationTables.map(rt => rt.tableId);
          await prisma.$transaction([
            prisma.payment.updateMany({
              where: { providerIntentId: intent.id },
              data: { status: "SUCCEEDED" },
            }),
            prisma.reservation.update({
              where: { id: reservation.id },
              data: { status: "CONFIRMED", depositStatus: "PAID" },
            }),
          ]);

          if (reservation.clientEmail) {
            const { sendReservationConfirmation } = await import("../services/email");
            sendReservationConfirmation({
              to: reservation.clientEmail,
              clientName: reservation.clientName,
              partySize: reservation.partySize,
              startTime: reservation.startTime,
              shortId: reservation.shortId,
              tableIds,
            }).catch(err => console.error("Webhook Email error:", err));
          }
        }
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as { id: string };
      await prisma.payment.updateMany({
        where: { providerIntentId: intent.id },
        data: { status: "FAILED" },
      });
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

export default router;
