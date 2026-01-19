# Phase 4b: Payment Integration (Stripe)

## Executive Summary
- Status: Production-ready Stripe integration; optimistic PI creation, verified webhooks, rate limiting, and stale-hold cleanup. Remaining ops: run migration, configure webhook, ensure worker is running.

## Scope
- Stripe PaymentIntent creation for deposits.
- Webhook verification and status updates.
- Business-hours validation and rate limiting.
- Cleanup job for stale PENDING_DEPOSIT reservations.

## Configuration
Required env vars:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `BUSINESS_HOURS_START` (default 17)
- `BUSINESS_HOURS_END` (default 22)

Startup safety:
- In production, the app throws on missing Stripe env vars.

## Payment Intent Flow (POST /reservations)
Decision: **Create PaymentIntent before acquiring locks** (optimistic).
Steps:
1. Validate request (Zod + time alignment + business hours).
2. If `partySize > 10`, call `stripe.paymentIntents.create()` before locking.
3. Acquire Redis locks (hour-bucket keys).
4. Transaction (Serializable):
   - Check overlaps.
   - Create `Reservation`.
   - Create `Payment` linked to reservation.
5. Return `clientSecret` in response.

## Webhook (POST /webhooks/stripe)
Signature verification:
- Webhook mounted before `express.json()` using `express.raw({ type: 'application/json' })`.
Events:
- `payment_intent.succeeded`:
  - Update `Payment.status = SUCCEEDED`
  - Update `Reservation.status = CONFIRMED`, `depositStatus = PAID`
- `payment_intent.payment_failed`:
  - Update `Payment.status = FAILED`

## Stale Hold Cleanup (BullMQ)
- Worker runs every minute.
- Finds reservations with:
  - `status = PENDING_DEPOSIT`
  - `createdAt < now - 15m`
- Cancels Stripe PaymentIntent (best-effort).
- Updates reservation to `CANCELLED` and marks payments `FAILED`.

## Rate Limiting & Business Hours
- `POST /reservations` is rate limited to 5 req/hr per IP.
- Business hours enforced via `BUSINESS_HOURS_START/END`.

## Implementation Files
- `src/routes/reservations.ts`: PaymentIntent + clientSecret + rate limit + business hours.
- `src/routes/webhooks.ts`: Stripe signature verification + event handling.
- `src/config/stripe.ts`: Stripe client.
- `src/config/env.ts`: new env vars and production checks.
- `src/jobs/cleanupPendingDeposits.ts`: BullMQ worker/scheduler.
- `src/app.ts`: webhook raw body handling.
- `prisma/schema.prisma`: `Reservation.createdAt`.

## Notes
- Apply a Prisma migration for `createdAt`.
- Consider adding webhook tests and integration tests for payment flow.
- Ensure webhook URL is registered in Stripe Dashboard with STRIPE_WEBHOOK_SECRET.
- Ensure cleanup worker runs in production (Procfile/PM2/Docker sidecar).

## Executive Summary (Phase 4b)
- Production-ready Stripe integration with optimistic PI creation, verified webhooks, rate limiting, and stale-hold cleanup. Remaining ops: run migration, configure webhook, keep worker running.

## Operational Reminders
- Run `npx prisma migrate dev --name add_created_at` (or equivalent deploy migration).
- Start BullMQ cleanup worker in prod.
- Configure Stripe webhook endpoint and secret.
- Ensure webhook URL is registered in Stripe Dashboard with STRIPE_WEBHOOK_SECRET.
- Ensure cleanup worker runs in production (Procfile/PM2/Docker sidecar).