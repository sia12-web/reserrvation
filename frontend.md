Restaurant Reservation Frontend Specification

0. Goal and Scope

Build a touchscreen-first frontend for a restaurant reservation system used by:

Staff (Primary / Phase 1)
Touchscreen kiosk or tablet inside the restaurant.

Clients (Phase 2)
Web/mobile booking.

Admin (Phase 3+)
Floor management, overrides, analytics.

The frontend must:

Never decide table assignments (backend is the single source of truth).
Be safe for shared kiosk usage (privacy, auto-reset).
Handle conflicts, deposits, and race conditions gracefully.
Be simple, fast, and resilient under real restaurant conditions.

1. Technology Stack (Frontend)

Core
React + TypeScript (strict)
Vite (fast builds, kiosk reload safety)
React Router
TanStack Query (server state, retries, cache control)
Zod (mirrors backend validation rules)
TailwindCSS (touch-friendly, fast iteration)

Utilities
dayjs or date-fns-tz (timezone-safe)
clsx (conditional styles)

UI Philosophy
Prefer headless components (shadcn/ui or custom)
Avoid heavy UI kits (no full MUI) -> kiosk hardware may be weak

2. Environment Configuration

Frontend must rely on explicit config, not device assumptions.

VITE_API_BASE_URL=https://api.example.com
VITE_RESTAURANT_TIMEZONE=America/Montreal
VITE_SLOT_INTERVAL_MINUTES=15
VITE_KIOSK_INACTIVITY_SECONDS=60

3. User Modes

3.1 Staff Kiosk (Phase 1)
Shared device
No authentication initially
Fast reservation entry
Auto-reset for privacy

3.2 Client Booking (Phase 2)
Personal device
Same reservation logic
Deposit/payment flow

3.3 Admin (Phase 3+)
Authenticated
Floor view (detailed), overrides, blocks, audits
Prompt system (Late arrivals, occupancy checks)

3.4 Reservation Management (Phase 4)
Manage existing booking
Cancel reservation
View details via shortId link

4. Core UX Principles (Touchscreen)

All tappable elements >= 48px
One-tap actions whenever possible
No scrolling for critical flows
Numeric keypad for phone and party size
Clear success / conflict / error states
Never rely on browser back button

5. Global Kiosk Hygiene (Critical)

5.1 Inactivity Auto-Reset
If no user interaction for 60 seconds:
Clear all form fields
Clear errors and mutation state
Clear cached form-related queries
Navigate to /kiosk/new

Triggers:
touch
click
keypress
pointer events

5.2 Post-Submission Cleanup
After a reservation succeeds:
The "New Reservation" action must hard-reset the app state
No previous name/phone may persist

6. Time and Timezone Handling (Non-Negotiable)

Frontend displays times in restaurant timezone
Frontend sends ISO UTC timestamps to backend
All selectable times are 15-minute aligned
"Now" must be computed relative to configured timezone, not device clock

Midnight / After-Midnight Handling
If restaurant closes after midnight:
Treat service day logically (e.g., 1:00 AM belongs to previous business day)
Time picker must prevent accidental date rollover errors

7. Reservation Flow - Staff Kiosk (Phase 1)

7.1 Screen: New Reservation (/kiosk/new)
Inputs
Name
Required
2-80 chars
Phone
Required
Numeric keypad
Auto-normalize to E.164-like format
Party Size
Stepper (1-50)
No free text
Start Time
Chip/Grid picker
Next N slots (e.g., next 12 = 3 hours)
15-minute increments only

Client-side Validation
Mirrors backend rules (Zod)
Blocks submit if invalid
Backend errors still displayed verbatim

Submission
Calls POST /reservations
Disable submit while in flight
Show loading state ("Creating reservation...")

7.2 Screen: Success (/kiosk/reservations/:id/success)
Displayed data (from POST response):
Reservation ID (shortened for display)
Status:
CONFIRMED -> green
PENDING_DEPOSIT -> amber
Assigned tables (e.g., T9 + T10)
Time window (start -> end)

Actions:
New Reservation (hard reset)
Copy details (optional)

Fallback:
If POST response lacks table/time (unexpected):
Show generic success + reservationId
Display warning: "Details unavailable - check system"

7.3 Screen: Conflict (/kiosk/reservations/conflict)
Triggered on HTTP 409.
Display:
"Time not available"
One-tap options:
"Try +15 min"
"Try +30 min"
"Try +45 min"
Each option:
Auto-adjusts startTime
Re-submits immediately
Additional actions:
"Change time"
"Change party size"
"Start over"

7.4 Network Error / Ambiguous Failure
If POST fails due to:
timeout
offline
unknown network error
Show:
"Connection unstable. The reservation may or may not have been created.
Do not retry blindly."
Actions:
"Retry anyway"
"Start over"
(Backend prevents double-booking, but UX must warn.)

8. Reservation Flow - Client (Phase 2)
Same core logic as kiosk with:
Client branding
Optional consent checkbox
Optional reservation lookup
Deposit payment screen (Phase 4)

9. Deposit Flow (Future - Phase 4)
Triggered when backend returns:
status = PENDING_DEPOSIT
Planned UI:
Show deposit required message ($50)
Stripe Elements payment
Poll GET /reservations/:id
Success -> CONFIRMED
Timeout -> expired message
Frontend must be structured so this can be added without rewriting Phase 1.

10. State Management Rules
Server State (TanStack Query)
Mutations:
createReservation
Queries (future):
getReservation
getFloor
Rules:
No polling in Phase 1
Disable retries for 409
Clear cache on kiosk reset

Local State
Form state local
No persistent storage for PII on kiosk

11. Error Handling Matrix

Scenario    UX Response
400 / 422   Inline field errors
409         Conflict screen
500         System error + retry
Network     Ambiguous warning
Timeout     Same as network

12. Accessibility and Safety

Keyboard navigable
Clear focus states
High contrast friendly
No hover-only interactions
Prevent pull-to-refresh:
overscroll-behavior: none;

13. Folder Structure
frontend/
  src/
    routes/
      kiosk/
        NewReservationPage
        ReservationSuccessPage
        ReservationConflictPage
      client/
        ReservePage
        ReserveSuccessPage
        ManageReservationPage
        DepositPage (future)
    components/
      admin/
        PromptSystem
        AdminGuard
      reservation/
        FloorMap (Admin vs Guest views)
        ReservationForm
        PartySizeStepper
        TimeSlotGrid
        PhoneInput
        ReservationSummary
      kiosk/
        InactivityGuard
      ui/
        Button
        Modal
        Toast
    api/
      reservations.api
      httpClient
    hooks/
      useInactivityTimer
      useCreateReservation
      useRestaurantTime
    utils/
      time
      phone
      validation
    styles/
      globals.css

14. Frontend Phases

Phase 1 - Staff Kiosk MVP
Create reservation
Success / Conflict handling
Inactivity reset
No payments

Phase 2 - Client Booking
Client form
Confirmation screen

Phase 3 - Live Floor — done.
Table grid (detailed for admin, simplified for guests)
Occupancy tracking
Polling

Phase 4 - Guest Management & Payments — in progress.
Stripe deposit UI
ManageBooking page (view/cancel) — done.
Status polling

Phase 5 - Admin Tools — done.
Reassign tables
Prompt system (Late warnings)
Blocks
Audit view

15. Acceptance Criteria (Phase 1)

Staff can create a reservation in <20 seconds
No PII remains after 60s inactivity
409 conflicts handled in one tap
No double submissions
Correct time alignment and timezone behavior
Works on iPad and kiosk screens

16. Source of Truth

Backend decides tables
Backend decides duration
Frontend only displays and retries
