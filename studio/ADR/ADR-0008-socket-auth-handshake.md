# ADR-0008: Socket.IO Authentication Handshake

## Status
Accepted

## Context
Socket.IO provides real-time features (messaging, course chat). We need to:
- Authenticate WebSocket connections
- Enforce email verification at connection time
- Prevent unauthenticated access to real-time features
- Define room/namespace access rules

## Decision

### Authentication Method: JWT via Handshake Auth

**Client sends JWT in handshake:**
```typescript
const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('jwt')
  }
});
```

**Server validates and extracts user:**
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    socket.data.userId = decoded.userId;
    socket.data.emailVerified = decoded.emailVerified;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});
```

**Why Handshake Auth:**
- Cleaner than query string (token not in logs)
- Standard Socket.IO pattern
- Works with same JWT as REST API
- Easy to implement

### Email Verification Enforcement

**Decision:** Reject unverified users at handshake

**Rationale:**
- Unverified users should not access ANY real-time features
- Messaging, course chat are verified-only features (see ADR-0005)
- Better to reject at connection than check per-message

**Implementation:**
```typescript
io.use((socket, next) => {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (!decoded.emailVerified) {
    return next(new Error('Email verification required'));
  }

  next();
});
```

**Client Handling:**
```typescript
socket.on('connect_error', (error) => {
  if (error.message === 'Email verification required') {
    showVerificationModal();
  }
});
```

### Connection Lifecycle

**Successful Connection:**
1. Client connects with JWT
2. Server validates JWT signature and expiry
3. Server checks emailVerified = true
4. Connection established
5. Client joins personal room: `user:{userId}`
6. Client can join course rooms

**Failed Connection:**
1. Client connects with JWT
2. Server validates JWT
3. Server checks emailVerified = false
4. Connection rejected with error
5. Client shows verification prompt

### Room Access Rules

**Personal Room (Auto-Join):**
- Room name: `user:{userId}`
- Purpose: Direct messaging, notifications
- Access: Only the user themselves
- Join: Automatic on connection

**Course Rooms (Manual Join):**
- Room name: `course:{courseId}`
- Purpose: Course chat, announcements
- Access: Only enrolled users
- Join: Client emits `join-course`, server verifies enrollment

```typescript
socket.on('join-course', async (courseId) => {
  const userId = socket.data.userId;

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId }
    }
  });

  if (enrollment) {
    socket.join(`course:${courseId}`);
    socket.emit('joined-course', { courseId });
  } else {
    socket.emit('error', { message: 'Not enrolled in this course' });
  }
});
```

### Error Handling

**Authentication Errors:**
- No token provided
- Invalid token
- Token expired

**Authorization Errors:**
- Not enrolled in course (for course room join)

### Security Considerations

**Token in Query String (Don't Do This):**
```typescript
// ❌ BAD
const socket = io(`http://localhost:5000?token=${jwt}`);

// ✅ GOOD
const socket = io('http://localhost:5000', { auth: { token } });
```

**JWT Expiry on WebSocket:**
- Token checked at connection time only
- If token expires mid-connection, user stays connected
- Client should reconnect with fresh token periodically

## Phase 2 Implementation Plan

**Phase 1:**
- Update `src/config/socket.ts` with auth middleware
- Add email verification check
- Implement personal room auto-join
- Document room access rules

## References
- Related: ADR-0001 (JWT Auth), ADR-0004 (Socket.IO Auth), ADR-0005 (Auth Flow)
- Documentation: [Socket.IO Authentication](https://socket.io/docs/v4/middlewares/#sending-credentials)
