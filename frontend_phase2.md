Restaurant Reservation Frontend Specification - Phase 2 (Client Booking MVP)

Scope
- Add client-facing reservation flow on top of existing Phase 1 kiosk app.
- Reuse shared components and utilities where possible.
- Do NOT change backend behavior or add new endpoints.
- No payments UI yet (deposit UI is Phase 4).

Routes (client)
- /reserve
- /reserve/success/:id

Backend API (unchanged)
POST {VITE_API_BASE_URL}/reservations
Request JSON:
- clientName (required)
- clientPhone (required, E.164-like)
- partySize (1..50)
- startTime (ISO string, future, aligned to slot interval)
- source optional (default WEB). Client must send source="WEB".
Response 201 JSON:
- reservationId
- status
- tableIds[]
- startTime
- endTime

Environment Variables
- VITE_API_BASE_URL
- VITE_RESTAURANT_TIMEZONE (default America/Montreal)
- VITE_SLOT_INTERVAL_MINUTES (default 15)

Client UX Requirements
1) Reserve Form (/reserve)
- Fields: Name, Phone, Party size (stepper), Start time (TimeSlotGrid)
- Mobile-first layout, comfortable spacing
- Client-side validation mirrors backend (Zod)
- Default values: partySize=2, startTime=next aligned slot
- On submit: disable submit, show loading state, send source="WEB"
- Phone normalization: strip non-digits, best-effort E.164 (+1 for NANP when missing)

2) Success (/reserve/success/:id)
- Must render from POST response without refetch
- Show: header, reservation ID (short), status pill (CONFIRMED green, PENDING_DEPOSIT amber),
  table assignment, time window in restaurant timezone
- If status is PENDING_DEPOSIT: show message
  "Deposit required to confirm ($50). Payment will be added next."
- If user refreshes: show fallback message (no GET endpoint yet)

3) Error Handling
- 400/422: field-level errors + top summary
- 409 conflict: inline panel with quick actions:
  Try +15 min, Try +30 min, Try +45 min (auto-resubmit)
  If conflict continues, user can pick a new time
- 500: show "System unavailable" and allow retry
- Network/timeout ambiguity:
  "Connection unstable. Reservation may or may not have been created. Do not retry blindly."
  Actions: "Retry anyway", "Start over"

4) Client Privacy
- Do NOT store PII (name/phone) in localStorage
- May store non-PII defaults only (party size, last time) if needed

Reuse / Shared Components
- PartySizeStepper
- TimeSlotGrid
- PhoneInput normalization utils
- useCreateReservation hook
- time utilities (timezone-safe)

Layout
- ClientShell layout distinct from kiosk styling.

Acceptance Checklist (Phase 2)
- Client flow works without breaking kiosk routes.
- Time display uses restaurant timezone.
- Start time sent as aligned UTC ISO string.
- Conflict quick actions work.
- Ambiguous network warning shown when appropriate.
