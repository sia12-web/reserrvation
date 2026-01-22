# Rollback Plan - v0.1.0

**Version:** v0.1.0
**Release Date:** 2025-01-22
**Phase:** Phase 3 - Release + CI Gates + Verifiable Rollout

---

## Overview

This document describes the rollback procedures for the authentication foundation release.

---

## Rollback Triggers

### Critical Issues (Immediate Rollback Required)

1. **Security Breach**
   - Token storage compromised (plaintext tokens in database)
   - JWT secret exposed in logs or code
   - Unauthorized access to user accounts

2. **Data Loss**
   - Database corruption
   - Accidental data deletion
   - Migration failure causing data loss

3. **Service Outage**
   - Application crashes preventing all access
   - Database connection failures
   - Authentication service completely down

### Major Issues (Rollback Within 24 Hours)

1. **High Error Rate**
   - Error rate > 5% for sustained period
   - Critical authentication failures
   - Email verification not working

2. **Performance Degradation**
   - Response time > 2s (p95) for sustained period
   - Database overload
   - Memory leaks causing crashes

### Minor Issues (Consider Rollback)

1. **Functional Bugs**
   - Specific edge cases not working
   - User experience issues
   - Non-critical authentication flows broken

---

## Rollback Procedures

### Option 1: Code Rollback (Recommended)

**When:** Critical bugs or issues discovered in code

**Steps:**

1. **Revert to Previous Version**
   ```bash
   # SSH into production server
   ssh production-server

   # Navigate to application directory
   cd /var/www/classmatefinder/backend

   # Revert to previous commit/tag
   git checkout <previous-version-tag>

   # Rebuild application
   npm run build

   # Restart application
   pm2 restart classmatefinder-backend
   # or
   sudo systemctl restart classmatefinder-backend
   ```

2. **Verify Rollback**
   ```bash
   # Check application status
   curl https://api.classmatefinder.com/health

   # Check logs for errors
   pm2 logs classmatefinder-backend --lines 50
   tail -f /var/log/classmatefinder/backend.log
   ```

3. **Monitor System**
   - Error rates should return to previous baseline
   - Response times should stabilize
   - User complaints should decrease

**Estimated Downtime:** 2-5 minutes

---

### Option 2: Database Migration Rollback

**When:** Migration causes data issues or corruption

**Steps:**

1. **Assess Migration Status**
   ```bash
   # Check migration status
   cd /var/www/classmatefinder/backend
   npx prisma migrate status

   # Identify problematic migration
   npx prisma migrate status --json
   ```

2. **Rollback Migration**
   ```bash
   # Resolve migration as rolled back
   npx prisma migrate resolve --rolled-back 20250122152109_add_email_verification

   # Verify migration status
   npx prisma migrate status
   ```

3. **Revert Schema Changes (Manual)**
   ```bash
   # If automatic rollback fails, manually revert schema
   psql $DATABASE_URL

   -- Drop new table
   DROP TABLE IF EXISTS "EmailVerificationToken" CASCADE;

   -- Remove new columns
   ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerified";
   ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerifiedAt";

   -- Exit
   \q
   ```

4. **Restart Application**
   ```bash
   pm2 restart classmatefinder-backend
   ```

**Estimated Downtime:** 5-15 minutes

**⚠️ WARNING:** Migration rollback may cause data loss if users registered during the window.

---

### Option 3: Feature Flag Rollback

**When:** Feature-level issues without code changes

**Steps:**

1. **Disable Email Verification (Future Implementation)**
   ```bash
   # Set environment variable
   REQUIRE_EMAIL_VERIFICATION=false

   # Restart application
   pm2 restart classmatefinder-backend
   ```

2. **Revert Domain Validation (Future Implementation)**
   ```bash
   # Set environment variable to allow all domains
   UNIVERSITY_DOMAINS="*"

   # Restart application
   pm2 restart classmatefinder-backend
   ```

**Note:** Feature flags not implemented in v0.1.0. This is for future releases.

---

## Pre-Rollout Preparation

### 1. Backup Strategy

**Database Backup:**
```bash
# Before migration
pg_dump $DATABASE_URL > backup_before_$(date +%Y%m%d_%H%M%S).sql

# Backup schema only
pg_dump --schema-only $DATABASE_URL > schema_backup.sql
```

**Code Backup:**
```bash
# Tag current stable version
git tag -a v0.0.0-before-auth -m "Before auth rollout"

# Push tags to remote
git push origin v0.0.0-before-auth
```

**Configuration Backup:**
```bash
# Backup environment variables
cp /etc/classmatefinder/backend.env /etc/classmatefinder/backend.env.backup
```

### 2. Rollback Testing

**Test Rollback in Staging:**
```bash
# Deploy new version to staging
# Verify it works
# Then test rollback procedures

# Revert code
git checkout v0.0.0-before-auth
npm run build
pm2 restart classmatefinder-backend-staging

# Verify system works correctly
```

---

## Rollback Execution

### Step 1: Detection

**Monitor these alerts:**
- Error rate > 5%
- Response time > 2s (p95)
- Database connection failures
- User complaints spike

### Step 2: Decision

**Rollback Decision Matrix:**

| Issue Severity | Time to Fix | Rollback? |
|----------------|-------------|-----------|
| Critical | Unknown | YES (immediate) |
| Critical | < 1 hour | MAYBE (if easy fix) |
| Major | < 4 hours | MAYBE (if easy fix) |
| Major | > 4 hours | YES |
| Minor | Any case | NO (schedule fix) |

### Step 3: Communication

**Notify:**
1. Engineering team
2. Product management
3. Stakeholders

**Message Template:**
```
SUBJECT: Rollback Initiated - ClassmateFinder v0.1.0

We are rolling back the authentication feature due to:
[Reason - e.g., high error rates, database issues]

Expected downtime: 5-15 minutes
We will provide updates every 15 minutes.

Status: [IN PROGRESS | COMPLETED | FAILED]
```

### Step 4: Execution

**Follow appropriate rollback procedure:**
- Option 1: Code rollback
- Option 2: Migration rollback
- Option 3: Feature flag rollback

### Step 5: Verification

**Verify rollback success:**
- ✅ Application responding
- ✅ Error rates normal
- ✅ No database errors
- ✅ Users can access system

### Step 6: Post-Rollback Analysis

**Document:**
- What triggered rollback
- What went wrong
- How to prevent in future
- Timeline for fix

---

## Post-Rollback Actions

### 1. Root Cause Analysis

**Questions to Answer:**
- Why did the issue occur?
- Could it have been detected in testing?
- What monitoring would have caught it earlier?
- How do we prevent recurrence?

### 2. Fix and Redeploy

**Process:**
1. Fix the issue in staging
2. Test thoroughly
3. Create new release candidate
4. Test in canary (10% traffic)
5. Gradual rollout (50%, then 100%)

### 3. Update Documentation

**Documents to Update:**
- [studio/phases/phase-03/release-notes.md](release-notes.md)
- [studio/phases/phase-03/rollout-plan.md](rollout-plan.md)
- Add new ADR if architecture changed

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Release Manager | [TBD] | [email] |
| Engineering Lead | [TBD] | [email] |
| Database Admin | [TBD] | [email] |
| On-Call Engineer | [TBD] | [phone] |

---

## Rollback Checklist

### Pre-Rollout ✅

- [ ] Database backup created
- [ ] Code tagged and backed up
- [ ] Rollback procedures tested in staging
- [ ] Emergency contacts confirmed
- [ ] Communication channels prepared

### During Rollback ⚠️

- [ ] Issue detected and confirmed
- [ ] Rollback decision made
- [ ] Team notified
- [ ] Stakeholders informed
- [ ] Rollback procedure initiated
- [ ] Progress updates sent (every 15 min)

### Post-Rollback ✅

- [ ] System verified as stable
- [ ] Root cause analysis initiated
- [ ] Fix plan developed
- [ ] Documentation updated
- [ ] Team retrospective scheduled

---

## Rollback Test Scenarios

### Scenario 1: Application Won't Start

**Symptoms:**
- PM2 shows "errored" status
- Systemd service failed
- Application crashes immediately

**Diagnosis:**
```bash
# Check logs
pm2 logs classmatefinder-backend --err
tail -50 /var/log/classmatefinder/backend.log
```

**Rollback:**
```bash
# Revert to previous version
git checkout v0.0.0-before-auth
npm run build
pm2 restart classmatefinder-backend
```

### Scenario 2: Database Migration Failed

**Symptoms:**
- Migration errors in logs
- Application can't connect to database
- Tables missing or incorrect schema

**Diagnosis:**
```bash
npx prisma migrate status
psql $DATABASE_URL -c "\dt"
```

**Rollback:**
```bash
# Rollback migration
npx prisma migrate resolve --rolled-back 20250122152109_add_email_verification

# Or manual schema revert
psql $DATABASE_URL
DROP TABLE IF EXISTS "EmailVerificationToken" CASCADE;
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerified";
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerifiedAt";
```

### Scenario 3: High Error Rate After Deployment

**Symptoms:**
- 500 Internal Server Error responses
- Authentication failures
- Email verification not working

**Diagnosis:**
```bash
# Check application logs
tail -100 /var/log/classmatefinder/backend.log | grep ERROR

# Check metrics
curl https://api.classmatefinder.com/health
```

**Rollback:**
```bash
# Code rollback
git checkout v0.0.0-before-auth
npm run build
pm2 restart classmatefinder-backend
```

---

## Recovery Time Objectives (RTO)

| Severity | Target RTO | Maximum RTO |
|----------|------------|-------------|
| Critical (security, data loss) | 5 minutes | 15 minutes |
| Major (high error rate) | 15 minutes | 1 hour |
| Minor (functional bugs) | 1 hour | 4 hours |

---

## Recovery Point Objectives (RPO)

| Data Type | Target RPO | Maximum RPO |
|-----------|------------|-------------|
| User registrations | 5 minutes | 15 minutes |
| Email verification tokens | 15 minutes | 1 hour |
| Application logs | 1 hour | 4 hours |

---

**Release Manager Signature:** ✅ ROLLBACK PLAN APPROVED
**Next Step:** Review Release Checklist
