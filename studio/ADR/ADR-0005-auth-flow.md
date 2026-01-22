# ADR-0005: Authentication Flow and Account States

## Status
Accepted

## Context
Building on ADR-0001 (JWT Authentication) and ADR-0002 (Email Verification), we need to define:
- Whether users can login before email verification
- Account state transitions
- What features are blocked until verification
- How verification state is enforced across the API

## Decision

### Login Before Verification: ALLOWED with Limited Access

**Choice:** Users CAN login before email verification, but receive a limited access token.

**Rationale:**
- Reduces friction - users can immediately explore the platform
- Encourages verification by showing what they're missing
- Allows us to send reminder prompts from within the app
- Better UX than forcing verification before any value is delivered

### Account States

```typescript
type AccountState = 'PENDING_VERIFICATION' | 'ACTIVE';

interface User {
  emailVerified: boolean;  // Maps to account state
  // false = PENDING_VERIFICATION
  // true = ACTIVE
}
```

**State Transitions:**
```
PENDING_VERIFICATION --[email verified]--> ACTIVE
```

No transition back to PENDING (verification is one-way).

### Access Control Matrix

| Feature | PENDING_VERIFICATION | ACTIVE |
|---------|---------------------|--------|
| Register | ✅ | ✅ |
| Login | ✅ (limited token) | ✅ (full token) |
| Verify Email | ✅ | N/A |
| Resend Verification | ✅ | ✅ |
| View Own Profile | ✅ | ✅ |
| Update Own Profile | ✅ | ✅ |
| Send Messages | ❌ | ✅ |
| Socket.IO Connection | ❌ | ✅ |
| Course Chat | ❌ | ✅ |
| Join Courses | ❌ | ✅ |
| Search Users | ❌ | ✅ |
| View Course List | ✅ (read-only) | ✅ |

### Enforcement Points

**1. Authentication Middleware** (`src/middleware/auth.ts`)
```typescript
// Attach verification state to request
req.userId = decoded.userId;
req.emailVerified = user.emailVerified;  // Added to JWT payload
```

**2. Verification Middleware** (`src/middleware/requireVerification.ts`)
```typescript
export const requireVerification = (req, res, next) => {
  if (!req.emailVerified) {
    return res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Email verification required for this action'
    });
  }
  next();
};
```

**3. Socket.IO Handshake** (`src/config/socket.ts`)
```typescript
io.use((socket, next) => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (!decoded.emailVerified) {
    return next(new Error('Email verification required'));
  }
  next();
});
```

### JWT Payload Differences

**PENDING_VERIFICATION Token:**
```json
{
  "userId": "user_123",
  "emailVerified": false,
  "iat": 1234567890,
  "exp": 1234654290
}
```

**ACTIVE Token:**
```json
{
  "userId": "user_123",
  "emailVerified": true,
  "iat": 1234567890,
  "exp": 1234654290
}
```

Same token structure, different `emailVerified` flag. Enforcement happens at middleware layer.

### Error Responses

**When unverified user tries blocked action:**
```json
{
  "code": "EMAIL_NOT_VERIFIED",
  "message": "Please verify your email to access this feature",
  "details": {
    "action": "sendMessage",
    "requirement": "verifiedEmail"
  }
}
```

### Client Responsibilities

1. Check `emailVerified` flag on login response
2. Show verification prompt if `false`
3. Disable verified-only features in UI
4. Display "Verify Email" banner/CTA
5. Allow resend verification from profile page

### Alternatives Considered

**Option A: No Login Until Verified**
- ❌ High friction - users can't see value before verifying
- ❌ Harder to encourage verification (no in-app prompts)

**Option B: Full Access Before Verification**
- ❌ Spam risk - unverified users can message others
- ❌ Defeats purpose of verification

**Option C: Limited Access Session (No JWT)**
- ❌ Complex - two different auth mechanisms
- ❌ Harder to enforce at API layer

### Consequences

**Positive:**
- ✅ Lower barrier to entry
- ✅ Users can explore before committing
- ✅ In-app verification reminders possible
- ✅ Single JWT mechanism for all users

**Negative:**
- ❌ More complex access control (middleware checks required)
- ❌ Clients must handle `emailVerified` flag
- ❌ Some users may never verify (but can't do much)

**Mitigations:**
- Clear UI messaging about verification benefits
- Periodic in-app reminders
- Block high-value features (messaging, courses)
- Rate limit resend verification to prevent spam

## Phase 2 Implementation Plan

**Modules:**
- `src/middleware/requireVerification.ts` - NEW
- `src/middleware/auth.ts` - Add `emailVerified` to JWT payload
- `src/controllers/auth.controller.ts` - Include `emailVerified` in login response
- `src/config/socket.ts` - Enforce at handshake
- `src/routes/` - Apply `requireVerification` to protected routes

**Database:**
- Add `emailVerified` field to User model (Prisma)
- Default value: `false`

## References
- Builds on: ADR-0001 (JWT Auth), ADR-0002 (Email Verification)
- Related: ADR-0008 (Socket Auth Handshake)
