# Verification Guide - Phase 0

This guide provides step-by-step instructions to verify that Phase 0 (Foundation & Standards) has been successfully implemented.

## Prerequisites

- Node.js installed (v18+)
- PostgreSQL installed and running
- Git installed

## Verification Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

**Expected Result:**
- All dependencies install successfully
- No errors during installation
- `node_modules/` directory created

**Verification:**
```bash
ls node_modules | wc -l
# Should show many packages (50+)
```

---

### Step 2: Configure Environment Variables

```bash
cp .env.example .env
```

Then edit `.env` and set these values:

```bash
# Generate a secure JWT secret (32+ chars)
# Run this command to generate one:
openssl rand -base64 32

# Or use a strong random string like:
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-change-this

# Database connection
DATABASE_URL=postgresql://username:password@localhost:5432/classmatefinder?schema=public

# Server configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
JWT_EXPIRES_IN=7d
```

**Expected Result:**
- `.env` file created
- JWT_SECRET is at least 32 characters
- DATABASE_URL is a valid PostgreSQL connection string

---

### Step 3: Set Up Database

```bash
# Create database (if needed)
createdb classmatefinder

# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

**Expected Result:**
```
✔ Generated Prisma Client
✔ The following migration has been created and applied from new schema changes:
migrations/
  └─ 20260121xxxxx_init/
    └─ migration.sql
```

**Verification:**
```bash
# You should see tables created
psql -d classmatefinder -c "\dt"
# Should show: User, Course, CourseEnrollment, Message tables
```

---

### Step 4: Run Tests

```bash
npm test
```

**Expected Result:**
```
PASS  tests/health.test.ts
  Health Check Endpoint
    GET /health
      ✓ should return 200 status (45ms)
      ✓ should return ok status (12ms)
      ✓ should return timestamp (8ms)
      ✓ should return environment (10ms)
      ✓ should work without authentication (15ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        2.145s
```

**If tests fail:**
- Check that database is running
- Verify `.env` file exists
- Ensure `DATABASE_URL` is correct

---

### Step 5: Run Linting

```bash
npm run lint
```

**Expected Result:**
- No errors
- Possibly some warnings (acceptable)
- Exit code 0

**Example output:**
```
(or if perfect:)
✨ No linting errors found!
```

---

### Step 6: Format Code

```bash
npm run format
```

**Expected Result:**
- Files are formatted according to `.prettierrc` rules
- No errors
- Exit code 0

**Verification:**
```bash
git diff
# Should show formatting changes if files weren't formatted
```

---

### Step 7: Build TypeScript

```bash
npm run build
```

**Expected Result:**
```
dist/
├── config/
│   ├── database.js
│   ├── env.js
│   ├── index.js
│   └── socket.js
├── controllers/
├── middleware/
├── routes/
├── types/
├── app.js
└── server.js
```

**Verification:**
```bash
ls dist
# Should show compiled JavaScript files
```

---

### Step 8: Start Development Server

```bash
npm run dev
```

**Expected Result:**
```
✅ Database connected successfully
🚀 Server running on port 5000
📝 Environment: development
🔗 CORS Origin: http://localhost:3000
```

**If server doesn't start:**
- Check that PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Ensure `JWT_SECRET` is at least 32 characters
- Check that port 5000 is not already in use

---

### Step 9: Test Health Endpoint

In a new terminal (while server is running):

```bash
curl http://localhost:5000/health
```

**Expected Result:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-21T10:30:00.000Z",
  "environment": "development"
}
```

**Or with PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:5000/health | Select-Object -ExpandProperty Content
```

---

### Step 10: Verify Environment Validation

Stop the server and test fail-fast validation:

```bash
# Remove JWT_SECRET from .env
sed -i '/JWT_SECRET/d' .env  # Linux/Mac
# Or manually edit .env and remove JWT_SECRET line

# Try to start server
npm run dev
```

**Expected Result:**
```
❌ Invalid environment variables:
  - JWT_SECRET: JWT_SECRET must be at least 32 characters

Please check your .env file and ensure all required variables are set.

[Process exits with code 1]
```

**Restore JWT_SECRET:**
```bash
# Add it back to .env
echo "JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long" >> .env
```

---

### Step 11: Verify Test Coverage

```bash
npm run test:coverage
```

**Expected Result:**
```
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |     100 |      100 |     100 |     100 |
 env.ts   |     100 |      100 |     100 |     100 |
 app.ts   |     100 |      100 |     100 |     100 |
----------|---------|----------|---------|---------|-------------------
```

---

### Step 12: Verify ADRs Exist

```bash
ls studio/ADR
```

**Expected Result:**
```
ADR-0001-auth-jwt.md
ADR-0002-email-verification.md
ADR-0003-university-domain-validation.md
ADR-0004-socket-auth.md
```

**Verification:**
```bash
# Check each ADR has content
grep -c "Status" studio/ADR/ADR-*.md
# Should show "Status: Accepted" in each file
```

---

## Quick Verification Script

Save this as `verify-phase0.sh` and run it:

```bash
#!/bin/bash
echo "🔍 Verifying Phase 0..."

echo "✅ Checking dependencies..."
test -d node_modules && echo "  ✓ Dependencies installed" || echo "  ✗ Run: npm install"

echo "✅ Checking .env..."
test -f .env && echo "  ✓ .env exists" || echo "  ✗ Run: cp .env.example .env"

echo "✅ Checking environment validation..."
grep -q "JWT_SECRET=.{32,}" .env && echo "  ✓ JWT_SECRET is valid length" || echo "  ✗ JWT_SECRET must be 32+ chars"

echo "✅ Running tests..."
npm test -- --silent 2>&1 | grep -q "5 passed" && echo "  ✓ All tests pass" || echo "  ✗ Tests failing"

echo "✅ Checking build..."
test -d dist && echo "  ✓ Build exists" || echo "  ✗ Run: npm run build"

echo "✅ Checking ADRs..."
test -f ../../studio/ADR/ADR-0001-auth-jwt.md && echo "  ✓ ADRs created" || echo "  ✗ ADRs missing"

echo "🎉 Verification complete!"
```

Run it:
```bash
chmod +x verify-phase0.sh
./verify-phase0.sh
```

---

## Troubleshooting

### Problem: "JWT_SECRET must be at least 32 characters"

**Solution:**
```bash
# Generate a proper secret
openssl rand -base64 32

# Or set it manually in .env
JWT_SECRET=this-is-a-very-long-secret-key-that-is-at-least-32-characters-long-yeah
```

### Problem: "DATABASE_URL must be a valid URL"

**Solution:**
Ensure your DATABASE_URL looks like:
```
postgresql://username:password@localhost:5432/classmatefinder?schema=public
```

### Problem: Tests fail with "Database connection error"

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep classmatefinder

# If not, create it
createdb classmatefinder
```

### Problem: Port 5000 already in use

**Solution:**
```bash
# Change PORT in .env
PORT=5001

# Or kill the process using port 5000
# Linux/Mac:
lsof -ti:5000 | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## Success Criteria

Phase 0 is successfully verified when:

- ✅ All dependencies installed
- ✅ Environment variables configured
- ✅ Database migrations applied
- ✅ All 5 tests pass
- ✅ No linting errors
- ✅ Code is formatted
- ✅ TypeScript compiles successfully
- ✅ Server starts without errors
- ✅ Health endpoint returns 200
- ✅ Environment validation works (fail-fast)
- ✅ All 4 ADRs exist

---

## Final Checklist

Before proceeding to Phase 1:

- [ ] `npm install` completed successfully
- [ ] `.env` file configured with valid values
- [ ] `npx prisma migrate dev` completed
- [ ] `npx prisma generate` completed
- [ ] `npm test` shows 5/5 passing
- [ ] `npm run lint` shows no errors
- [ ] `npm run build` created `dist/` directory
- [ ] `npm run dev` starts server successfully
- [ ] Health endpoint returns correct JSON
- [ ] Environment validation tested (server exits without JWT_SECRET)

**All boxes checked?** ✅ You're ready for Phase 1!

---

**Last Updated:** 2026-01-21
**Phase:** Phase 0 - Foundation & Standards
