# ADR-0002: Email Verification

## Status
Accepted

## Context
ClassmateFinder targets university students and needs to:
- Ensure users are legitimate university students
- Prevent fake/spam accounts
- Enable password reset via email
- Verify .edu email ownership

## Decision
We will implement mandatory email verification for all user registrations.

### Implementation Details

**Registration Flow:**
1. User submits registration with .edu email
2. Account created with `emailVerified: false`
3. Verification token generated (UUID, 24h expiry)
4. Verification email sent with token link
5. User clicks link → token validated → `emailVerified: true`
6. User can now fully use the application

**Token Storage:**
```prisma
model EmailVerificationToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique @default(uuid())
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

**Email Service:**
- Phase 0-1: Mock email service (console.log + development endpoint)
- Phase 2: Integrate SendGrid/Resend/AWS SES
- Template: HTML with verification button and alternative link

**API Endpoints:**
- `POST /api/auth/register` - Returns `requiresVerification: true`
- `POST /api/auth/verify-email` - `{ token }` → marks user verified
- `POST /api/auth/resend-verification` - Sends new token (rate-limited)

**Access Control:**
- Unverified users: Can verify email, resend verification, login (limited)
- Unverified users: Cannot post messages, join courses, search users
- Verified users: Full access

### Alternatives Considered

**No Email Verification:**
- ❌ Spam accounts proliferate
- ❌ No .edu ownership proof
- ❌ Cannot do password resets

**SMS Verification:**
- ❌ Expensive
- ❌ Privacy concerns
- ❌ International students may not have local numbers

**.edu Domain Only (No Verification):**
- ✅ Prevents most spam
- ❌ No proof of ownership
- ❌ Cannot recover accounts

**OAuth (Google/Microsoft SSO):**
- ✅ Handles verification for us
- ❌ Requires .edu emails to be registered with those providers
- ❌ Users may not want to connect university accounts
- ✅ Can add as complementary option later

### Consequences

**Positive:**
- ✅ Reduces fake accounts significantly
- ✅ Enables password reset flows
- ✅ Proves email ownership
- ✅ Builds user trust

**Negative:**
- ❌ Adds friction to registration
- ❌ Requires email service (cost/complexity)
- ❌ Some users may not receive emails (spam filters)
- ❌ Cannot easily test without real .edu emails

**Mitigations:**
- Development mode: bypass verification or use test tokens
- Clear UI: "Check your spam folder" messaging
- Resend functionality: users can request new tokens
- Rate limiting: prevent abuse of resend
- Logging: track delivery failures

## Implementation
- [x] Add `emailVerified` field to User model
- [x] Create EmailVerificationToken model in Prisma schema
- [x] Add verification endpoints to auth routes
- [x] Create mock email service (Phase 0)
- [x] Add middleware to check verification status
- [ ] Integrate real email provider (Phase 2)
- [ ] Add password reset flow (Phase 2)

## References
- [Email Verification Best Practices](https://sendgrid.com/blog/why-you-should-be-using-email-verification/)
