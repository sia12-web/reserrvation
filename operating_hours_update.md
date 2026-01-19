# Operating Hours Update

## Overview
Updated the operating hours in both the backend and frontend to match the new business requirements.

## Changes

### Backend
**File:** `src/utils/time.ts`

Updated the `isWithinBusinessHours` function to reflect the following schedule:
- **Sunday - Thursday:** 11:30 - 22:00
- **Friday - Saturday:** 11:30 - 23:00

**Previous Schedule:**
- Mon-Thu: 11:30 - 22:30
- Fri-Sat: 11:30 - 23:30

### Frontend
**File:** `frontend/src/utils/time.ts`

Updated the `isWithinBusinessHours` function to match the backend schedule. This ensures:
1. Validates available time slots in the UI.
2. Prevents users from selecting invalid times before sending a request.
