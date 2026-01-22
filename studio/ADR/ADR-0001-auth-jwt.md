# ADR-0001: JWT-Based Authentication

## Status
Accepted

## Context
ClassmateFinder requires a secure, stateless authentication mechanism that:
- Supports both web and potential mobile clients
- Scales horizontally without session management
- Integrates cleanly with Socket.IO for real-time features
- Provides user context for API requests

## Decision
We will use JSON Web Tokens (JWT) for authentication.

### Implementation Details

**Token Structure:**
- Algorithm: HS256 (HMAC-SHA256)
- Payload: `{ userId, iat, exp }`
- Expiration: 7 days (configurable via `JWT_EXPIRES_IN`)
- Secret: 32+ character secret key from environment

**Flow:**
1. User authenticates (register/login) → receives JWT
2. Client includes JWT in `Authorization: Bearer <token>` header
3. Server validates JWT signature and expiration
4. `userId` extracted and attached to `req.userId` via middleware
5. Protected routes check `req.userId` exists

**Middleware Chain:**
```typescript
// src/middleware/auth.ts
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, env.JWT_SECRET);
  req.userId = decoded.userId;
  next();
};
```

### Alternatives Considered

**Session-Based Auth:**
- ❌ Requires session store (Redis/memory)
- ❌ Harder to scale horizontally
- ❌ Complicates Socket.IO integration

**OAuth 2.0:**
- ❌ Overkill for single-tenant application
- ❌ Adds external dependencies
- ✅ Could be added later for social login

**API Keys:**
- ❌ Designed for service-to-service, not users
- ❌ No built-in user context
- ❌ Revocation requires complex logic

### Consequences

**Positive:**
- ✅ Stateless - scales horizontally easily
- ✅ Works seamlessly with Socket.IO
- ✅ Simple client implementation
- ✅ Built-in expiration handling
- ✅ No session storage required

**Negative:**
- ❌ Tokens cannot be easily revoked before expiration
- ❌ Requires secure secret key management
- ❌ Token size larger than session IDs
- ❌ Must implement refresh token pattern for better security

**Mitigations:**
- Store JWT version/hash in DB for revocation (future enhancement)
- Use HTTPS only (token in header is secure)
- Implement refresh tokens with short-lived access tokens (Phase 2)

## Implementation
- [x] Add JWT secret to env validation (32+ chars)
- [x] Create auth middleware in `src/middleware/auth.ts`
- [x] Use in all protected routes
- [ ] Add refresh token flow (Phase 2)
- [ ] Add token versioning for revocation (Phase 3)

## References
- [JWT.io Introduction](https://jwt.io/introduction)
- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)
