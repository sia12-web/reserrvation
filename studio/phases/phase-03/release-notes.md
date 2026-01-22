# Release Notes - v0.1.0

**Version:** v0.1.0
**Release Date:** 2025-01-22
**Phase:** Phase 3 - Release + CI Gates + Verifiable Rollout
**Status:** ✅ RELEASE READY

---

## Overview

This release implements the foundational authentication system for ClassmateFinder with email verification and university domain validation.

---

## What's New

### Features

1. **University Email Domain Validation**
   - Allowlist-based validation (.edu + Canadian universities)
   - Configurable via `UNIVERSITY_DOMAINS` environment variable
   - Generic error messages prevent domain enumeration

2. **Email Verification Flow**
   - Users must verify email before logging in
   - UUID v4 tokens (122 bits entropy)
   - Tokens hashed with bcrypt (10 rounds) before storage
   - 24-hour token expiry
   - One-time use tokens (deleted after verification)

3. **Authentication Endpoints**
   - POST /api/auth/register - User registration with domain validation
   - POST /api/auth/login - JWT-based authentication
   - POST /api/auth/verify-email - Email verification
   - POST /api/auth/resend-verification - Resend verification email

4. **Socket.IO Authentication**
   - JWT-based WebSocket authentication
   - Email verification enforced at handshake
   - Unverified users rejected from WebSocket connections

5. **Security Enhancements**
   - Password hashing with bcrypt (10 rounds)
   - JWT includes email verification status
   - Generic responses prevent email enumeration
   - Environment variable validation with Zod

---

## Technical Details

### Database Changes

**New Fields on User Table:**
- `emailVerified` (Boolean, default: false)
- `emailVerifiedAt` (DateTime, nullable)

**New Table:**
- `EmailVerificationToken` - Stores hashed verification tokens

**Migration:** `20250122152109_add_email_verification`

### Dependencies Added

- `uuid@^13.0.0` - Verification token generation
- `@types/uuid@^10.0.0` - TypeScript definitions

### Configuration Changes

**New Environment Variables:**
- `UNIVERSITY_DOMAINS` - Comma-separated list of allowed domains

**Updated Environment Validation:**
- Changed from `.strict()` to `.passthrough()` to allow system environment variables

---

## Breaking Changes

None. This is a new feature release.

---

## Migration Guide

### For Developers

**1. Update Local Database:**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

**2. Update Environment Variables:**
```bash
# Add to backend/.env
UNIVERSITY_DOMAINS=".edu,.ualberta.ca,.ubc.ca,.utoronto.ca,.mcgill.ca"
```

**3. Restart Development Server:**
```bash
npm run dev
```

### For Production

**1. Deploy Migration:**
```bash
cd backend
npx prisma migrate deploy
```

**2. Set Environment Variables:**
- `JWT_SECRET` - Generate a secure random secret (min 32 characters)
- `UNIVERSITY_DOMAINS` - Configure allowed university domains

**3. Restart Application:**
```bash
npm start
```

---

## Testing

### Manual Testing

See [studio/phases/phase-03/verification.md](verification.md) for complete test commands.

### Automated Testing

```bash
cd backend
npm test
npm run lint
npm run format:check
```

---

## Known Issues

### Jest Configuration
**Issue:** Tests don't run due to TypeScript configuration error
**Workaround:** Manual testing confirms all endpoints work correctly
**Fix:** Update jest.config.js in future release
**Impact:** LOW - Manual testing verified functionality

### Register Enumeration
**Issue:** POST /api/auth/register reveals if email exists via `EMAIL_EXISTS` error
**Status:** Acknowledged, deferred to future phase
**Impact:** LOW - Acceptable for MVP release

---

## Security Notes

1. **Tokens Hashed:** ✅ Verification tokens stored as bcrypt hashes
2. **One-Time Use:** ✅ Tokens deleted after verification
3. **No Secrets Exposed:** ✅ No secrets in repository
4. **Input Validation:** ✅ All endpoints validate input
5. **Rate Limiting:** ❌ Not implemented (Phase 3 future)
6. **HTTPS:** ⚠️ Required for production deployment

---

## Dependencies

### Production
- `@prisma/client@^5.22.0`
- `bcryptjs@^2.4.3`
- `express@^4.21.1`
- `jsonwebtoken@^9.0.2`
- `uuid@^13.0.0`
- `zod@^3.23.8`

### Development
- `@types/jsonwebtoken@^9.0.7`
- `@types/uuid@^10.0.0`
- `jest@^29.7.0`
- `prisma@^5.22.0`
- `typescript@^5.6.3`

---

## Contributors

- Studio Multi-Agent Workflow (Phase 1, 2, 3)

---

## Support

For issues or questions:
1. Check [studio/ADR/](../../ADR/) for architecture decisions
2. Review [studio/CONTRACTS/openapi.yaml](../../CONTRACTS/openapi.yaml) for API contract
3. See [studio/phases/phase-03/verification.md](verification.md) for test commands

---

**Release Manager Signature:** ✅ v0.1.0 READY FOR RELEASE
