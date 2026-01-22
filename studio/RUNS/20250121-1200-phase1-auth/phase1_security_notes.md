# Phase 1 Security Notes (Spec-Level)

**Date:** 2025-01-22
**Phase:** Phase 1 - Authentication Foundation
**Status:** Spec-Level Analysis

## Overview

This document outlines security considerations for the authentication specification. Implementation-level mitigations are noted for Phase 2.

---

## 1. User Enumeration Prevention

### Risk: Attackers can determine which emails are registered

**Endpoints at Risk:**
- `POST /auth/register` - Reveals if email already exists
- `POST /auth/resend-verification` - Reveals if email is registered

**Spec-Level Mitigations:**

#### Register Endpoint
Current spec returns `EMAIL_EXISTS` error.

**Risk:** Attacker can enumerate emails by attempting registration.

**Recommendation (Phase 2):**
- Accept registration request even if email exists
- Send generic "If registered, check your email" message
- Log the attempt for abuse detection
- Trade-off: Slightly worse UX for better security

#### Resend Verification Endpoint
✅ **GOOD:** Returns generic success even if email not found

**Status:** Already prevents enumeration

### Open Questions for Phase 2:
1. Should we accept duplicate registration requests silently?
2. Should we log enumeration attempts?
3. Should we implement CAPTCHA after N failed attempts?

---

## 2. Brute Force Attacks

### Risk: Attackers guess passwords or verification tokens

**Endpoints at Risk:**
- `POST /auth/login` - Password brute force
- `POST /auth/verify-email` - Token brute force
- `POST /auth/resend-verification` - Email flooding

**Spec-Level Considerations:**

#### Login Endpoint
**Attack:** Try many passwords for known email

**Mitigation (Phase 2):**
- Rate limiting: 5 attempts per email per hour
- Exponential backoff: 1 min, 5 min, 15 min, 1 hour lockout
- Account lockout after 10 failed attempts
- Log failed attempts for alerting

#### Token Entropy
- UUID v4 = 122 bits of entropy
- Requires 2^122 guesses to brute force
- ✅ Sufficiently secure (no additional mitigation needed)

#### Resend Verification Endpoint
**Attack:** Flood user with verification emails

**Mitigation (Phase 2):**
- Rate limiting: 3 resend requests per email per hour
- CAPTCHA after 2 failed attempts
- Cooldown period between sends
- Log abuse patterns

### Spec Recommendations for Phase 2:
Add `429 RATE_LIMITED` response with `retryAfter` header.

---

## 3. Token Replay Prevention

### Risk: Attacker reuses captured verification token

**Current Spec:**
- Tokens are hashed in DB (see ADR-0006)
- Tokens expire after 24 hours
- Tokens are one-time use (deleted after verification)

**Analysis:**

#### Hashing
✅ **Good:** Even if DB compromised, attacker can't use tokens

#### One-Time Use
✅ **Good:** Tokens deleted after verification, can't replay

#### Expiry
✅ **Good:** 24-hour window limits exposure

**Additional Mitigation (Phase 2):**
- Log token use (IP, timestamp, user agent)
- Detect multiple verification attempts from different IPs
- Flag suspicious patterns for review

**Spec is complete for replay prevention.**

---

## 4. JWT Security

### Risk: Token theft, forgery, or misuse

**Current Spec:**
- Algorithm: HS256 (HMAC-SHA256)
- Secret: 32+ characters enforced by Zod
- Expiry: 7 days (604,800 seconds)
- Payload includes: userId, emailVerified, iat, exp

**Analysis:**

#### Secret Management
✅ **Good:** Min 32 chars enforced
✅ **Good:** No fallback values
⚠️ **Phase 2:** Rotate secrets periodically (e.g., every 90 days)
⚠️ **Phase 2:** Use different secrets for dev/staging/prod

#### Token Expiry
⚠️ **Concern:** 7 days is long-lived
✅ **Mitigation:** Token versioning in DB for revocation (Phase 2)
⚠️ **Phase 2:** Implement refresh token pattern (short-lived access token)

**Current spec acceptable for MVP.**

---

## 5. Domain Validation Security

### Risk: Bypassing university email requirement

**Current Spec:**
- Allowlist of approved domains
- Generic error messages
- No domain revelation in errors

**Analysis:**

#### Allowlist Poisoning
⚠️ **Phase 2 Risk:** Admin adds malicious domain
✅ **Mitigation:** Audit log, approval workflow

#### Typosquatting
**Risk:** `uaberta.ca` instead of `ualberta.ca`
✅ **Current:** Generic error doesn't help attacker

**Spec is solid for domain validation.**

---

## 6. WebSocket Security

### Risk: Unauthorized real-time access

**Current Spec:**
- JWT required for connection
- Email verified required for connection
- Room-based authorization
- Token validated at handshake

**Analysis:**

#### Handshake Authentication
✅ **Good:** Token in auth object (not query string)
✅ **Good:** Rejected if email not verified
✅ **Good:** Consistent with REST API

#### Room Authorization
✅ **Good:** Enrollment verified before joining course rooms

**Spec is sound for WebSocket security.**

---

## 7. Password Security

### Risk: Password theft, cracking, or reuse

**Current Spec:**
- Minimum 8 characters
- Hashed with bcrypt (10 rounds)
- Not returned in any response

**Analysis:**

#### Password Strength
⚠️ **Concern:** Only length requirement (8 chars)
✅ **Current:** Validation via express-validator
⚠️ **Phase 2:** Add complexity requirements (uppercase, number, special char)
⚠️ **Phase 2:** Check against common password lists

**Acceptable for MVP, needs enhancement in Phase 2.**

---

## 8. Rate Limiting Recommendations (Phase 2)

### Endpoints Requiring Rate Limits:

| Endpoint | Limit | Window | Rationale |
|----------|-------|--------|-----------|
| POST /auth/login | 5/IP/hour | 1 hour | Prevent password brute force |
| POST /auth/register | 3/IP/hour | 1 hour | Prevent spam accounts |
| POST /auth/verify-email | 10/IP/hour | 1 hour | Prevent token brute force |
| POST /auth/resend-verification | 3/email/hour | 1 hour | Prevent email flooding |

### Implementation (Phase 2):
- Use `express-rate-limit` or Redis-backed rate limiter
- Track by IP address and/or email
- Return `429 RATE_LIMITED` with `retry-after` header
- Log rate limit violations

---

## 9. Logging and Monitoring (Phase 2)

### Security Events to Log:

| Event | Details | Purpose |
|-------|---------|---------|
| Failed login | Email, IP, timestamp | Detect brute force |
| Registration attempt | Email, IP, domain | Detect spam patterns |
| Email verification | Token use, IP, timestamp | Detect replay attacks |
| Rate limit hit | Endpoint, IP, count | Detect abuse patterns |
| Suspicious activity | Various | Security review |

### Log Considerations:
- Never log passwords or tokens (plaintext)
- Hash PII before logging
- Secure log storage (access controls)
- Retention policy (e.g., 90 days)

---

## 10. HTTPS Requirements

**Status:** ⚠️ Critical for Phase 2 deployment

**All authentication endpoints MUST use HTTPS:**
- Prevents token theft in transit
- Required for HttpOnly cookies
- Industry standard for auth APIs

**Development HTTP is acceptable.**
**Production MUST use HTTPS.**

---

## Summary

### Spec-Level Security: ✅ Solid

**Strengths:**
- User enumeration prevented (generic errors)
- Token security addressed (hashing, expiry, one-time use)
- JWT basics correct (secret length, algorithm)
- Domain validation sound (allowlist, generic errors)
- WebSocket auth consistent with REST

**Phase 2 Priorities:**
1. **HIGH:** Rate limiting (login, register, resend)
2. **HIGH:** HTTPS for production
3. **MEDIUM:** Token refresh mechanism (shorten access token expiry)
4. **MEDIUM:** Password complexity requirements
5. **MEDIUM:** Security logging and monitoring
6. **LOW:** Token versioning for revocation
7. **LOW:** CAPTCHA for abuse prevention

**No critical security flaws in specification.**

---

**Reviewed By:** Security Role (Spec-Level Analysis)
**Next Review:** Phase 2 Implementation Security
**Date:** 2025-01-22
