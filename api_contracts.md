# API Contracts

## POST /reservations
- Purpose: Create a reservation, auto-assign tables, enforce deposits for large parties.
- Request (application/json):
  - clientName: string (2–80, not emoji-only)
  - clientPhone: string (E.164, e.g., "+14155551212")
  - partySize: integer [1..50]
  - startTime: ISO string; must be future, within business hours, and aligned to 15-minute boundary (UTC)
  - source: "WEB" | "KIOSK" | "PHONE" (optional, default WEB)
- Processing:
  - Compute endTime via duration policy (partySize-based).
  - Load active layout tables + adjacency from DB (no hardcoded layout).
  - Check availability (overlap) for requested window.
  - Run table-assignment engine with DB-provided capacities/adjacency.
  - If partySize > 10: create Stripe PaymentIntent **before** acquiring locks; store intent id and return clientSecret.
  - Acquire Redis locks per table per hour bucket across the interval:
    - `LOCK:TABLE:{tableId}:{YYYY-MM-DD}:{HH}`
  - Transaction (Serializable):
    - Re-check overlaps on ReservationTable + Reservation.
    - Create Reservation + ReservationTable rows.
    - Create Payment row if deposit required (status PROCESSING).
    - Deposit logic: partySize > 10 ⇒ status=PENDING_DEPOSIT, depositStatus=PENDING; else CONFIRMED/NOT_REQUIRED.
- Responses:
  - 201 Created:
    - reservationId: string (UUID)
    - status: ReservationStatus
    - tableIds: string[]
    - startTime: ISO
    - endTime: ISO
    - clientSecret: string | null
  - 400 Bad Request: validation failure (Zod), bad time alignment, past time, outside business hours.
  - 409 Conflict: lock contention or DB overlap detected.
  - 500 Server Error: unexpected failure / missing active layout.

## POST /webhooks/stripe
- Raw body: `express.raw({ type: 'application/json' })` is required (mounted before express.json).
- Signature verification via STRIPE_WEBHOOK_SECRET.
- Events:
  - `payment_intent.succeeded`: Reservation → CONFIRMED, depositStatus → PAID; Payment → SUCCEEDED.
  - `payment_intent.payment_failed`: Payment → FAILED (Reservation left as-is unless cleanup handles later).

## Rate Limiting
- POST /reservations: 5 req/hour per IP (express-rate-limit).

## Admin Endpoints
- **Authentication**: Requires `x-admin-pin` header or `pin` query param matching `ADMIN_PIN` env.

### GET /admin/reservations
- List reservations with filtering (`from`, `to`, `status`, `phone`, `tableId`).
- Supports cursor-based pagination.

### GET /admin/floor
- Returns live occupancy state for all tables in the active layout.
- Provides status, partySize, and reservation details for occupied tables.

### POST /admin/walkins
- Create immediate reservation for a walk-in.
- Supports manual table selection or auto-assignment.
- Sets status to `CHECKED_IN` automatically.

### POST /admin/reservations/:id/reassign
- Move a reservation to different tables.
- Validates capacity and availability (excluding current reservation) on new tables.
- Logs action to audit log.

### POST /admin/tables/:tableId/free
- Marks a table as available now.
- Changes active reservation status to `COMPLETED` and sets `endTime` to now.
- Logs action to audit log.

### POST /admin/reservations/:id/late-warning
- Manually trigger a "late arrival" email for a reservation.
- Updates `lateWarningSent: true` on the reservation.
- Logs action to audit log.

## Public Management Endpoints
Endpoints accessible to guests via their unique `shortId` link.

### GET /reservations/:shortId
- Retrieve full reservation details (status, time, tables) for a specific booking.
- Used by the Manage Booking page.

### POST /reservations/:id/cancel
- Cancel a reservation.
- Frees all associated tables and updates status to `CANCELLED`.
- Logs action to audit log.

## Cleanup (Stale Deposit Holds)
- BullMQ worker runs every minute to cancel PENDING_DEPOSIT older than 15 minutes, cancel PaymentIntent best-effort, set Reservation to CANCELLED and Payment to FAILED.

## Notes
- Business hours enforced via env BUSINESS_HOURS_START/END (UTC hours).
- Admin endpoints restricted by PIN.
