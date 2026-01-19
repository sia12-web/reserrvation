# Restaurant Reservation Backend (Backend.md)

## 0. Goal
Build a production-ready reservation system for guests (web/mobile) and staff/admin (kiosk/tablet) to manage reservations, live floor, deposits, and overrides. Priorities: prevent double booking, enforce business rules, support payments, and maintain auditability.

## 1. Tech Stack
- Runtime: Node.js (LTS) + Express
- Language: TypeScript (strict)
- Database: PostgreSQL
- ORM: Prisma
- Caching/Locks: Redis (ioredis) + Redlock
- Jobs: BullMQ (Redis) for TTL/cleanup/email (future work)
- Payments: Stripe (future work)
- Observability: Pino logging; OTEL/Prometheus (future work)

## 2. Table Layout & Adjacency
- Layouts are versioned; one active layout at a time.
- Table types: STANDARD, MERGED_FIXED, CIRCULAR (CIRCULAR never combines; max 7).
- Current physical IDs: T1–T14.
- Adjacency (undirected):
  - Bottom: T1—T2, T2—T3
  - Left: T7—T8
  - Top chain: T9—T10—T11—T12—T13
  - Vertical: T13—T14
  - Isolated: T4, T6 (circular), T5

## 3. Core Business Rules
- Validation: name 2–80 chars, not emoji-only; phone E.164; party 1–50; startTime future and aligned to slotInterval (15m).
- Dynamic duration:
  - 1–2: 75m; 3–4: 90m; 5–6: 105m; 7–8: 120m; 9–10: 135m; 11–14: 150m; 15+: 180m.
- Deposit: required when partySize > 10 → status PENDING_DEPOSIT, depositStatus PENDING. (PaymentIntent + TTL cleanup pending).
- Circular tables: never combined; capacity cap 7.
- Overlap rule: [A_start, A_end) overlaps [B_start, B_end) iff A_start < B_end && B_start < A_end (strict end allows back-to-back).

## 4. Data Models (Prisma)
- Enums: Role (ADMIN, STAFF, CLIENT); TableType (STANDARD, MERGED_FIXED, CIRCULAR); ReservationStatus (HOLD, PENDING_DEPOSIT, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, NO_SHOW); DepositStatus (NOT_REQUIRED, PENDING, PAID, REFUNDED); ReservationSource (WEB, KIOSK, PHONE); PaymentProvider (STRIPE); PaymentStatus (SUCCEEDED, PROCESSING, FAILED).
- User: id (uuid), email?, phone (unique), role, preferences (JSON).
- Layout: id (uuid), name, isActive, adjacencyGraph (JSONB), effectiveDate, tables[].
- Table: id (string, e.g., "T1"), layoutId, type, minCapacity, maxCapacity, priorityScore. PK (id, layoutId).
- Reservation: id (uuid), shortId (8), clientName, clientPhone, clientEmail?, partySize, startTime/endTime (timestamptz), status, depositStatus, source, internalNotes?, customerNotes?, lateWarningSent (bool), version (int).
- ReservationTable: reservationId, tableId, layoutId, isPrimary. PK (reservationId, tableId, layoutId).
- AuditLog: reservationId, action, reason, details (JSON).

## 5. APIs (current)
- POST /reservations
  - Validates payload (Zod), enforces 15m alignment & future time & business hours.
  - Computes duration by party size.
  - Loads active layout + tables + adjacency from DB (no hardcoded layout).
  - Computes availability (overlap query) and runs assignment engine.
  - Deposit logic: if partySize > 10 → Stripe PaymentIntent created optimistically **before** locks; stores Payment in txn; returns clientSecret.
  - Acquires Redlock locks per table per hour bucket in the window.
  - Runs Prisma transaction (Serializable) to re-check overlaps, create Reservation + ReservationTable (+ Payment if deposit).
  - Returns 201 with reservationId/status/tableIds/startTime/endTime/clientSecret.
- GET /reservations/:shortId
  - Public route to fetch reservation details by shortId for management.
- POST /reservations/:id/cancel
  - Public route to allow guests to cancel their own reservations.
- POST /admin/reservations/:id/late-warning
  - Admin-only route to trigger manual "late" notification and mark `lateWarningSent: true`.

## 6. Table Assignment Engine
- Inputs: partySize, available table IDs, table configs + adjacency (from DB), options (maxTablesInCombination=3).
- Candidate generation: singles and connected subgraphs (DFS/BFS) up to 3 tables; circular tables never combined; circular excluded when partySize > 7.
- Scoring: minimize waste; penalty for multi-table; penalty for using MERGED_FIXED for small parties; fragment penalty to avoid breaking T9–T13 chain; circular combo penalty; slight priorityScore adjustment; deterministic tie-break on tableIds.
- Output: ranked candidates, best selection.

## 7. Concurrency & Locks
- Redis locks: keys per table per hour bucket: `LOCK:TABLE:{id}:{YYYY-MM-DD}:{HH}` covering all buckets across the requested interval.
- DB: Prisma transaction with isolationLevel Serializable; overlap check inside txn on ReservationTable + Reservation.
- If lock acquisition fails → 409; if DB overlap detected → 409.

## 8. Payments
- Stripe PaymentIntent created for partySize > 10 before locks; returns client_secret.
- Webhook endpoint updates Reservation/Payment on success/failure.
- TTL cleanup (BullMQ) cancels PENDING_DEPOSIT > 15 minutes, cancels PaymentIntent best-effort, marks Reservation CANCELLED and Payment FAILED.

## 9. Security & Operational
- Auth/rate limiting not yet implemented (to add on POST /reservations and admin endpoints).
- PII: phone stored plaintext; use logging redaction in production.
- Business hours validation not yet enforced (add config-driven hours).

## 10. Implementation Plan (status)
- Phase 1: Schema, scaffolding, Prisma generate — done.
- Phase 2: Assignment engine + tests — done.
- Phase 3: Admin Operations (Floor Map, Walk-ins, Table Reassignment, Freeing Tables) — done.
- Phase 4: Customer flow (POST /reservations + Payments) — done.
- Next: Final E2E verification, Auth hardening (JWT), and UI polish.

## 11. Admin Operations Summary
- **Floor State**: Real-time occupancy tracking with reservation linking.
- **Late Warning System**: Manual admin-controlled check-in prompts. Admins are prompted to confirm arrival after 15 minutes; if "No", a late warning email is triggered.
- **Manual Overrides**: Admin can reassign tables for existing reservations with capacity/availability checks.
- **Table Management**: Occupied tables can be "freed" immediately, setting reservations to COMPLETED.
- **Walk-ins**: Direct creation of reservations with immediate CHECKED_IN status.
- **Audit Logs**: All admin overrides, late warnings, and user cancellations are recorded in the `AuditLog` table.

## 12. Operational Checklist (pre-prod)
- Run `npx prisma migrate dev --name add_created_at`.
- Apply manual GIST/exclusion SQL: `prisma/migrations/manual_overlap_gist.sql` (enables btree_gist, adds Reservation time GIST index, and exclusion constraint on ReservationTable for overlapping ranges).
- Provide env: DATABASE_URL, REDIS_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BUSINESS_HOURS_START/END, PORT.
- Register webhook URL in Stripe Dashboard with STRIPE_WEBHOOK_SECRET.
- Ensure BullMQ cleanup worker runs in prod (separate worker or sidecar).
