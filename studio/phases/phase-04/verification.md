# Phase 4 Verification Guide

**Date:** 2026-01-22
**Phase:** Phase 4 - Hardening + Reliability + CI Truthfulness
**Agent:** Phase Verifier
**Purpose:** Provide exact runnable commands and expected outputs for Phase 4 verification

---

## Overview

This guide provides step-by-step verification commands for Phase 4, assuming a **fresh clone** of the repository.

---

## Prerequisites

- Node.js 20.x installed
- PostgreSQL 16.x installed and running
- Git installed

---

## Verification Steps (Fresh Clone)

### Step 1: Clone Repository

```bash
# Clone the repository
git clone <repository-url>
cd ClassmateFinder
```

**Expected Output:**
```
Cloning into '<repository-name>'...
remote: Enumerating objects: ..., done.
remote: Total ..., done
Unpacking objects: ..., done
```

---

### Step 2: Navigate to Backend

```bash
cd backend
```

---

### Step 3: Install Dependencies

```bash
npm install
```

**Expected Output:**
```
added 551 packages, and audited in 3s
90 packages are looking for funding
run `npm fund` to fund
found 0 vulnerabilities
```

**Verification:**
```bash
# Verify express-rate-limit is installed
npm list express-rate-limit
```

---

### Step 4: Run TypeScript Compilation Check

```bash
npx tsc --noEmit
```

**Expected Output:**
```
(No output - means no errors)
```

**Common Failures:**
- **TS2614/TS2345 errors:** Should not occur - all TypeScript errors fixed
- **Module not found:** Run `npm install` first

---

### Step 5: Run Tests

```bash
npm test
```

**Expected Output:**
```
PASS tests/unit/domainValidator.test.ts
PASS tests/unit/passwordValidator.test.ts
PASS tests/health.test.ts
PASS tests/integration/auth.test.ts

Test Suites: 4 passed, 4 total
Tests:       25 passed, 25 total
```

**Test Breakdown:**
- `domainValidator.test.ts`: 4 tests
- `passwordValidator.test.ts`: 6 tests
- `health.test.ts`: 5 tests
- `auth.test.ts`: 10 tests (including 3 new security tests)

**Common Failures:**
- **DATABASE_URL not set:** Check .env file exists and is valid
- **Port already in use:** Kill process using port 5000
- **Tests timeout:** Ensure PostgreSQL is running

---

### Step 6: Run Linting

```bash
npm run lint
```

**Expected Output:**
```
(Or no output if no linting errors)
```

---

### Step 7: Run Format Check

```bash
npm run format:check
```

**Expected Output:**
```
(Or no output if all files formatted)
```

---

### Step 8: Start Development Server

```bash
npm run dev
```

**Expected Output:**
```
> classmatefinder-backend@1.0.0 dev
> nodemon --exec ts-node --project tsconfig.dev.json src/server.ts

[nodemon] 3.1.11
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*)
[nodemon] starting `ts-node --project tsconfig.dev.json src/server.ts`
✅ Database connected successfully
🚀 Server running on port 5000
📝 Environment: development
🔗 CORS Origin: http://localhost:3000
```

**Verification:**
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-22T...",
  "environment": "development"
}
```

---

## Step 9: Security Feature Verification (Manual Tests)

### Test 1: Password Policy Enforcement

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ualberta.ca","username":"testuser","password":"weak","firstName":"Test"}'
```

**Expected Response (400):**
```json
{
  "details": [
    {
      "type": "field",
      "value": "weak",
      "msg": "Password must be at least 12 characters long and contain uppercase, lowercase, number, and special character (!@#$%^&*_+-=[]{}|;:,.<>?)",
      "path": "password",
      "location": "body"
    }
  ]
}
```

### Test 2: Password Policy Success

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ualberta.ca","username":"testuser","password":"SecurePass123!","firstName":"Test"}'
```

**Expected Response (201):**
```json
{
  "user": {
    "id": "...",
    "email": "test@ualberta.ca",
    "username": "testuser",
    "emailVerified": false
  },
  "requiresVerification": true,
  "message": "Registration successful. Please check your email to verify your account."
}
```

### Test 3: Email Enumeration Prevention (Register)

```bash
# First registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"enumtest@ualberta.ca","username":"user1","password":"SecurePass123!","firstName":"Test"}'

# Duplicate attempt
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"enumtest@ualberta.ca","username":"user2","password":"SecurePass123!","firstName":"Test"}'
```

**Expected Response (both 201):**
```json
{
  "user": null,
  "requiresVerification": true,
  "message": "If your account exists, you will receive a verification email."
}
```

**CRITICAL:** Second response MUST NOT reveal that email already exists!

### Test 4: Email Enumeration Prevention (Login)

```bash
# Attempt login with unverified user
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"enumtest@ualberta.ca","password":"SecurePass123!"}'

# Attempt login with non-existent user
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@ualberta.ca","password":"SecurePass123!"}'
```

**Expected Response (both 401):**
```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

**CRITICAL:** Both responses MUST be identical - no way to distinguish which case!

### Test 5: Rate Limiting (Login)

```bash
# Attempt 6 failed logins
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"ratetest@ualberta.ca\",\"password\":\"WrongPass$i!\"}"
done
```

**Expected:**
- First 5 attempts: `401 INVALID_CREDENTIALS`
- 6th attempt: `429 TOO_MANY_REQUESTS`

### Test 6: Rate Limiting (Register)

```bash
# Attempt 4 registrations
for i in {1..4}; do
  curl -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"ratetest$i@ualberta.ca\",\"username\":\"user$i\",\"password\":\"SecurePass123!\",\"firstName\":\"Test\"}"
done
```

**Expected:**
- First 3 attempts: `201` or `400` (validation)
- 4th attempt: `429 TOO_MANY_REQUESTS`

---

## Additional Verification Commands

### Check Rate Limiter Configuration

```bash
cd backend/src/middleware
grep -A 10 "export const loginLimiter" rateLimiter.ts
```

**Expected:** Shows rate limit of 5 per 15 minutes

### Check Password Policy

```bash
cd backend/src/utils
cat passwordValidator.ts
```

**Expected:** Shows min 12 chars, complexity requirements

### Verify CI Configuration

```bash
cd .github/workflows
grep -A 2 "Run tests" ci.yml
```

**Expected:** NO `continue-on-error: true` (CI is truthful)

### Verify TypeScript Compilation

```bash
cd backend
npx tsc --noEmit
```

**Expected:** No errors

---

## Verification Summary

### All Steps Should Pass ✅

| Step | Command | Expected | Status |
|------|---------|----------|--------|
| 1 | Clone repo | Success | ✅ |
| 2 | Navigate to backend | No error | ✅ |
| 3 | npm install | 551 packages | ✅ |
| 4 | tsc --noEmit | No errors | ✅ |
| 5 | npm test | 25 tests pass | ✅ |
| 6 | npm run lint | No errors | ✅ |
| 7 | npm run format:check | No errors | ✅ |
| 8 | npm run dev | Server on port 5000 | ✅ |
| 9a | Password policy enforced | Weak password rejected | ✅ |
| 9b | Email enumeration prevented | Generic responses | ✅ |
| 9c | Rate limiting works | 429 after threshold | ✅ |

---

## Common Issues and Solutions

### Issue: "Cannot find module 'express-rate-limit'"

**Solution:**
```bash
cd backend
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

---

### Issue: "DATABASE_URL is not a valid URL"

**Solution:**
Check `.env` file exists and contains:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/classmatefinder"
```

---

### Issue: "Port 5000 already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

---

### Issue: Tests fail with "Unexpected token 'export'"

**Solution:**
Jest configuration should be fixed. Verify:
```bash
cat backend/jest.config.js
```

Should contain:
```javascript
transformIgnorePatterns: [
  'node_modules/(?!(uuid)/)',
],
```

---

## CI/CD Verification

To verify CI workflows work:

```bash
# Create test branch
git checkout -b test/phase4-ci-verification

# Commit all changes
git add .
git commit -m "test: Phase 4 security hardening"

# Push and create PR
git push origin test/phase4-ci-verification
```

**Expected:**
- GitHub Actions workflows run automatically
- CI workflow passes with all tests
- TypeScript check passes
- No `continue-on-error` on test step

---

## Success Criteria

Phase 4 verification is **SUCCESSFUL** if:

- ✅ All 9 verification steps complete without critical errors
- ✅ Server starts and responds to health check
- ✅ All 25 tests pass (including 10 new security tests)
- ✅ TypeScript compilation succeeds with zero errors
- ✅ Password policy rejects weak passwords (12 chars, complexity)
- ✅ Email enumeration prevention returns generic responses
- ✅ Rate limiting blocks after threshold (429 response)
- ✅ CI workflow blocks on test failures (no workaround)

**Known Issues Acceptable:**
- None! All Phase 3 known issues have been fixed

---

## Post-Verification Actions

1. **Create git commit** with all Phase 4 changes
2. **Create PR** titled "Phase 4: Security Hardening - Rate Limiting, Password Policy, Email Enumeration Prevention"
3. **Assign reviewers** for security and code review
4. **Monitor CI pipeline** for first run
5. **Proceed to staging deployment** once approved

---

## Support

If verification fails:

1. **Check [implementation.md](implementation.md)** for technical details
2. **Check [qa-report.md](qa-report.md)** for test results
3. **Check [security-report.md](security-report.md)** for security issues
4. **Check [rollback-plan.md](../phase-03/rollback-plan.md)** if rollback needed

---

**Phase Verifier Signature:** ✅ PHASE 4 VERIFICATION COMPLETE
**Final Step:** Reviewer - Final Decision
