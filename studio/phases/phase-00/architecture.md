# Architecture Decisions - Phase 0

## Overview
This document summarizes all architecture decisions made during Phase 0 (Foundation & Standards).

## Decision Summary

| ADR # | Title | Status | Impact |
|-------|-------|--------|--------|
| ADR-0001 | JWT-Based Authentication | Accepted | High - Core auth mechanism |
| ADR-0002 | Email Verification | Accepted | High - User onboarding flow |
| ADR-0003 | University Domain Validation | Accepted | Medium - Registration restrictions |
| ADR-0004 | Socket.IO Authentication | Accepted | High - Real-time features |

## Detailed ADRs

See individual ADR files in [adr/](adr/) directory:

- **[ADR-0001: JWT-Based Authentication](adr/ADR-0001-auth-jwt.md)** - Stateless token-based auth using HS256 with 7-day expiration
- **[ADR-0002: Email Verification](adr/ADR-0002-email-verification.md)** - Mandatory email verification via .edu tokens
- **[ADR-0003: University Domain Validation](adr/ADR-0003-university-domain-validation.md)** - Restrict registration to .edu and approved domains
- **[ADR-0004: Socket.IO Authentication](adr/ADR-0004-socket-auth.md)** - Reuse JWT tokens for WebSocket authentication

## Technical Stack Decisions

### Environment Validation
- **Choice:** Zod for schema validation
- **Rationale:** Type-safe inference, excellent error messages, fail-fast startup
- **Impact:** All env vars validated before server starts

### Testing Framework
- **Choice:** Jest + ts-jest + Supertest
- **Rationale:** Industry standard, great TypeScript support, simple API
- **Impact:** Consistent test structure across the project

### Code Quality
- **Choice:** ESLint + Prettier
- **Rationale:** Catch errors early, consistent formatting, team alignment
- **Impact:** Enforced code style and quality standards

### API Design
- **Health Check:** GET /health (no auth)
  - Returns: status, timestamp, environment
  - Purpose: Smoke test, load balancer checks
  - No authentication required (intentional)

## Security Considerations

1. **JWT Secret Management**
   - Minimum 32 characters enforced via Zod
   - No fallback values (fail-fast if missing)
   - Stored in environment only

2. **Environment Validation**
   - DATABASE_URL validated as proper URL format
   - CORS_ORIGIN validated as proper URL format
   - Invalid configs cause immediate startup failure

3. **CORS Configuration**
   - Restricted to specific origin via env var
   - Credentials enabled for cookies/auth headers
   - Applied to both REST and WebSocket

## Future Considerations

### Phase 2+
- Add JWT refresh token flow
- Implement email service provider integration
- Add rate limiting to endpoints
- Implement token revocation mechanism

### Phase 3+
- Add admin interface for domain allowlist management
- Implement token versioning for revocation
- Add periodic WebSocket re-authentication

## Cross-Cutting Concerns

### Type Safety
- Strict TypeScript enabled
- Zod provides runtime validation + TypeScript types
- No `any` types without explicit justification

### Error Handling
- Express async errors middleware installed
- Zod provides detailed validation errors
- Fail-fast on configuration errors

### Developer Experience
- Comprehensive npm scripts (dev, build, test, lint, format)
- Clear error messages for configuration issues
- Health check for quick smoke tests

## References
- [Zod Documentation](https://zod.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Socket.IO Authentication](https://socket.io/docs/v4/middlewares/)
