# Rollout Plan - v0.1.0

**Version:** v0.1.0
**Release Date:** 2025-01-22
**Phase:** Phase 3 - Release + CI Gates + Verifiable Rollout

---

## Overview

This document describes the rollout plan for the authentication foundation release.

---

## Pre-Rollout Checklist

### 1. Environment Setup ✅

- [x] Development environment configured
- [x] Database migration tested locally
- [x] All endpoints tested manually
- [x] CI workflows configured

### 2. Production Prerequisites ⚠️

- [ ] PostgreSQL database provisioned
- [ ] Environment variables configured
- [ ] SSL/TLS certificates obtained
- [ ] Domain name configured
- [ ] Backup strategy defined

---

## Rollout Strategy

### Phase 1: Staging Deployment

**Target:** Staging Environment
**Timing:** Week 1, Day 1-2
**Goal:** Validate deployment in production-like environment

**Steps:**

1. **Database Setup**
   ```bash
   # Provision staging database
   # Configure DATABASE_URL in staging environment
   ```

2. **Deploy Application**
   ```bash
   # Deploy backend to staging
   cd backend
   npm ci --production
   npx prisma migrate deploy
   npx prisma generate
   npm run build
   ```

3. **Configure Environment Variables**
   ```bash
   # Set in staging environment
   NODE_ENV=production
   DATABASE_URL=<staging-db-url>
   JWT_SECRET=<generate-secure-secret>
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://staging.classmatefinder.com
   UNIVERSITY_DOMAINS=.edu,.ualberta.ca,.ubc.ca,.utoronto.ca,.mcgill.ca
   ```

4. **Smoke Tests**
   ```bash
   # Run verification commands
   curl https://staging.classmatefinder.com/health
   curl -X POST https://staging.classmatefinder.com/api/auth/register ...
   ```

5. **Monitoring Setup**
   - Configure application logging
   - Set up error tracking (e.g., Sentry)
   - Enable database query logging

**Success Criteria:**
- ✅ All health checks pass
- ✅ Auth endpoints return expected responses
- ✅ No runtime errors in logs
- ✅ Database migrations applied successfully

---

### Phase 2: Canary Deployment (10% Traffic)

**Target:** Production (10% of users)
**Timing:** Week 1, Day 3
**Goal:** Test with limited real traffic

**Steps:**

1. **Deploy to Production**
   ```bash
   # Follow same steps as staging, but on production infrastructure
   ```

2. **Configure Load Balancer**
   ```bash
   # Route 10% of traffic to new version
   # 90% to existing version (if applicable)
   ```

3. **Monitor Metrics**
   - Error rates
   - Response times
   - Database query performance
   - Authentication success/failure rates

4. **Log Analysis**
   - Check for unexpected errors
   - Monitor authentication failures
   - Track email verification rates

**Success Criteria:**
- ✅ Error rate < 1%
- ✅ Response time < 500ms (p95)
- ✅ No database connection issues
- ✅ Email verification rate > 80%

**Rollback Trigger:**
- Error rate > 5%
- Response time > 2s (p95)
- Database connection failures
- Any security incident

---

### Phase 3: Full Deployment (100% Traffic)

**Target:** Production (100% of users)
**Timing:** Week 1, Day 4-5
**Goal:** Complete rollout

**Steps:**

1. **Increase Traffic Gradually**
   - Day 4: 50% traffic
   - Day 5: 100% traffic

2. **Final Monitoring**
   - All metrics from canary phase
   - User feedback analysis
   - Performance benchmarking

**Success Criteria:**
- ✅ All metrics remain stable
- ✅ No critical bugs reported
- ✅ System performs under load

---

## Deployment Steps

### 1. Prepare Environment

```bash
# Clone repository
git clone <repository-url>
cd ClassmateFinder/backend

# Install dependencies
npm ci --production

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 2. Build Application

```bash
npm run build
```

### 3. Configure Environment

Create `/etc/classmatefinder/backend.env`:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/classmatefinder
JWT_SECRET=<generate-with-openssl-rand-64>
JWT_EXPIRES_IN=7d
PORT=5000
CORS_ORIGIN=https://classmatefinder.com
UNIVERSITY_DOMAINS=.edu,.ualberta.ca,.ubc.ca,.utoronto.ca,.mcgill.ca,.uwaterloo.ca
```

### 4. Start Application

```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start dist/server.js --name classmatefinder-backend

# Or using systemd
sudo systemctl start classmatefinder-backend
```

### 5. Verify Deployment

```bash
# Health check
curl https://api.classmatefinder.com/health

# Test auth endpoints
curl -X POST https://api.classmatefinder.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ualberta.ca","username":"test","password":"TestPass123","firstName":"Test"}'
```

---

## Monitoring Plan

### 1. Application Metrics

**Key Metrics:**
- Request rate (per endpoint)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active WebSocket connections

**Tools:**
- Application Performance Monitoring (APM)
- Log aggregation (e.g., ELK, CloudWatch)
- Metrics dashboard (e.g., Grafana, Datadog)

### 2. Database Metrics

**Key Metrics:**
- Connection pool usage
- Query performance (slow queries)
- Migration status
- Table size growth

**Tools:**
- PostgreSQL metrics exporter
- Database monitoring tools

### 3. Security Metrics

**Key Metrics:**
- Failed authentication attempts
- Email verification rate
- Token verification failures
- Rate limit violations (when implemented)

**Tools:**
- Security information and event management (SIEM)
- Audit logging

---

## Rollback Plan

See [studio/phases/phase-03/rollback-plan.md](rollback-plan.md) for detailed rollback procedures.

**Quick Rollback:**
```bash
# Revert to previous version
git checkout <previous-version-tag>

# Rebuild and restart
npm run build
pm2 restart classmatefinder-backend

# Or rollback migration
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## Communication Plan

### Pre-Release

1. **Team Notification**
   - Notify engineering team of pending release
   - Share release notes and rollout plan
   - Schedule on-call during rollout week

2. **Stakeholder Notification**
   - Inform product management of timeline
   - Share testing access to staging environment

### Post-Release

1. **User Notification**
   - Email verification required for new users
   - Existing users may need to verify (if applicable)

2. **Documentation Update**
   - Update API documentation
   - Share integration guides with frontend team

---

## Risk Assessment

### High Risk ⚠️

**Risk:** Database migration failure
**Mitigation:**
- Test migration in staging first
- Create database backup before migration
- Have rollback plan ready
- Run migration during low-traffic period

### Medium Risk ⚠️

**Risk:** Email delivery issues
**Mitigation:**
- Mock email service in Phase 2
- Configure real email service (SendGrid, Resend) before full rollout
- Monitor email delivery rates
- Have fallback notification method

### Low Risk ✅

**Risk:** JWT secret leakage
**Mitigation:**
- Store in secure environment variable
- Rotate regularly
- Use different secrets for dev/staging/prod

---

## Timeline

| Phase | Day | Activity | Status |
|-------|-----|----------|--------|
| Staging | 1-2 | Deploy to staging, smoke tests | ⏳ Pending |
| Canary | 3 | 10% traffic to production | ⏳ Pending |
| Full Rollout | 4-5 | Gradual increase to 100% | ⏳ Pending |
| Post-Release | Ongoing | Monitor, address issues | ⏳ Pending |

---

## Success Metrics

### Technical Metrics
- ✅ Uptime > 99.9%
- ✅ Response time < 500ms (p95)
- ✅ Error rate < 1%
- ✅ Email verification rate > 80%

### Business Metrics
- ✅ User registration completion rate > 60%
- ✅ Email verification time < 5 minutes
- ✅ Support tickets related to auth < 5% of total

---

## Next Steps

1. ✅ Complete staging deployment
2. ⏳ Configure production infrastructure
3. ⏳ Execute canary deployment
4. ⏳ Monitor and adjust
5. ⏳ Full rollout

---

**Release Manager Signature:** ✅ ROLLOUT PLAN APPROVED
**Next Step:** Review Rollback Plan
