# ADR-0006: Email Verification Token Storage

## Status
Accepted

## Context
Email verification requires a secure, one-time token that:
- Proves email ownership
- Cannot be guessed or brute-forced
- Expires after reasonable time
- Prevents replay attacks
- Can be resent if expired

## Decision

### Token Generation

**Method:** High-entropy random token (UUID v4)

**Format:** `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

**Example:** `a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d`

**Entropy:** 122 bits (sufficient for security)

### Token Storage

**Critical Decision:** Store HASHED token, never plaintext

**Why:**
- If DB is compromised, attackers cannot use tokens
- Tokens are sensitive - they grant access to user accounts
- Hashing adds defense-in-depth

**Hashing Method:** bcrypt (same as password hashing)

**Rounds:** 10 (matches password hashing cost)

**Schema:**
```prisma
model EmailVerificationToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String   @unique  // bcrypt hash of token
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}
```

**Never store plaintext token.**

### Verification Flow

**1. Token Creation (Register/Resend):**
```typescript
const token = randomUUID();  // Generate plaintext token
const tokenHash = await bcrypt.hash(token, 10);  // Hash it

// Store hash in DB
await prisma.emailVerificationToken.create({
  data: {
    userId: user.id,
    tokenHash,  // Store ONLY the hash
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24 hours
  }
});

// Send plaintext token via email (only time it's exposed)
await sendEmail(user.email, { token });
```

**2. Token Verification:**
```typescript
const { token } = req.body;

// Find ALL tokens for this user that haven't expired
const tokens = await prisma.emailVerificationToken.findMany({
  where: {
    userId,
    expiresAt: { gt: new Date() }
  }
});

// Check each token hash
for (const record of tokens) {
  const isValid = await bcrypt.compare(token, record.tokenHash);
  if (isValid) {
    // Token verified! Mark user as verified
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true }
    });
    
    // Delete ALL tokens for this user (cleanup)
    await prisma.emailVerificationToken.deleteMany({
      where: { userId }
    });
    
    return { success: true };
  }
}

// No match found
throw new Error('TOKEN_INVALID');
```

### Token Expiry

**Duration:** 24 hours

**Rationale:**
- Long enough for users to check email (including spam folder)
- Short enough to limit abuse window
- Industry standard (Gmail, AWS, etc.)

### Resend Rules

**Decision:** Invalidate old token, create new one

**Rationale:**
- Prevents confusion (only one valid token at a time)
- Reduces attack surface
- Simpler logic (check most recent token)

**Resend Flow:**
```typescript
// Delete ALL existing tokens for this user
await prisma.emailVerificationToken.deleteMany({
  where: { userId }
});

// Create new token
const newToken = randomUUID();
const newTokenHash = await bcrypt.hash(newToken, 10);

await prisma.emailVerificationToken.create({
  data: {
    userId,
    tokenHash: newTokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
});

// Send new token via email
await sendEmail(user.email, { token: newToken });
```

## Phase 2 Implementation Plan

**Modules:**
- `src/services/emailVerificationService.ts` - NEW (token generation, hashing, verification)
- `src/services/emailService.ts` - NEW (send emails)
- `src/controllers/auth.controller.ts` - verify-email, resend-verification endpoints
- `src/middleware/rateLimit.ts` - NEW (resend rate limiting)

**Database:**
- Add `EmailVerificationToken` model to Prisma schema
- Add migration

## References
- Related: ADR-0002 (Email Verification), ADR-0005 (Auth Flow)
