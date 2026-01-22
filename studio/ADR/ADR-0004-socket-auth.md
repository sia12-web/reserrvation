# ADR-0004: Socket.IO Authentication

## Status
Accepted

## Context
ClassmateFinder uses Socket.IO for real-time features:
- Direct messaging between users
- Course chat rooms
- Typing indicators
- Online status

WebSocket connections need authentication to:
- Associate connections with users
- Enforce access control (can't join courses you're not enrolled in)
- Enable targeted messaging (`user:${userId}` rooms)
- Prevent anonymous spam

## Decision
We will reuse JWT tokens for Socket.IO authentication, validating tokens in the middleware chain.

### Implementation Details

**Authentication Flow:**

1. **Client sends token during connection:**
```typescript
const socket = io('http://localhost:5000', {
  auth: { token: localStorage.getItem('jwt') }
});
```

2. **Server validates token in middleware:**
```typescript
// src/config/socket.ts
io.use((socket, next) => {
  const token = socket.handshake.auth.token ||
                socket.handshake.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});
```

3. **UserId available in connection handler:**
```typescript
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  socket.join(`user:${socket.userId}`);
});
```

**Room-Based Authorization:**

Users can join rooms for:
- Personal messages: `user:${userId}` (auto-join)
- Course chats: `course:${courseId}` (enrollment verified)

```typescript
socket.on('join-course', async (courseId) => {
  // Verify enrollment before joining
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: {
      userId_courseId: { userId: socket.userId, courseId }
    }
  });

  if (enrollment) {
    socket.join(`course:${courseId}`);
  } else {
    socket.emit('error', { message: 'Not enrolled in this course' });
  }
});
```

**Token Expiration Handling:**

- Token checked once during connection
- If token expires mid-connection: stay connected (WebSocket already authenticated)
- Client should reconnect with fresh token periodically
- Future enhancement: implement token refresh over WebSocket

### Alternatives Considered

**No Auth (Public Rooms):**
- ❌ Anyone can join course chats
- ❌ Cannot identify users
- ❌ Spam vulnerability
- ❌ Privacy violation

**Session-Based Auth:**
- ❌ Requires separate authentication flow
- ❌ Doesn't integrate with JWT middleware
- ❌ Complexity: maintain both JWT and session state

**Separate Token for Socket:**
- ✅ Could have shorter expiration
- ❌ Duplicated authentication logic
- ❌ Client must manage two tokens
- ❌ No clear benefit over reusing JWT

**Cookie-Based Auth:**
- ✅ Automatic with CORS configured
- ❌ Harder to work with Socket.IO client
- ❌ Mobile apps: cookies are awkward
- ❌ CORS complexity

### Consequences

**Positive:**
- ✅ Consistent with REST API authentication
- ✅ Single source of truth (JWT)
- ✅ Simple client implementation
- ✅ UserId readily available in handlers
- ✅ Works for web + mobile

**Negative:**
- ❌ Token only validated at connection time
- ❌ Long-lived WebSocket connections have stale auth
- ❌ Cannot revoke access without disconnecting
- ❌ Middleware error handling is awkward (Socket.IO specific)

**Mitigations:**
- Shorter token expiration for development (1h vs 7d)
- Client-side: reconnect with fresh token periodically
- Server-side: implement `disconnect()` endpoint for forced logout
- Future: periodic re-authentication middleware
- Future: token version checking in DB

## Security Considerations

**Token in Query String (Alternative):**
```typescript
// DON'T DO THIS - token appears in logs
const socket = io(`http://localhost:5000?token=${jwt}`);

// DO THIS - token in auth object or header
const socket = io('http://localhost:5000', { auth: { token } });
```

**CORS Configuration:**
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,  // Same as Express
    credentials: true
  }
});
```

## Implementation
- [x] Add JWT validation to Socket.IO middleware
- [x] Attach userId to socket object
- [x] Create `user:${userId}` room pattern
- [x] Implement course enrollment verification
- [x] Add error handling for auth failures
- [ ] Add periodic re-authentication (Phase 2)
- [ ] Add admin disconnect endpoint (Phase 3)

## References
- [Socket.IO Authentication Documentation](https://socket.io/docs/v4/middlewares/#sending-credentials)
