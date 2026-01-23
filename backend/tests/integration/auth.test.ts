import request from 'supertest';
import { httpServer } from '../../src/app';
import prisma from '../../src/config/database';

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    // Clean up database
    await prisma.user.deleteMany({});
    await prisma.emailVerificationToken.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
    // Close server
    httpServer.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register user with valid university domain', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'test@ualberta.ca',
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.emailVerified).toBe(false);
      expect(response.body.requiresVerification).toBe(true);
      expect(response.body.user.email).toBe('test@ualberta.ca');
    });

    it('should reject registration with invalid domain', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'test@gmail.com',
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('DOMAIN_NOT_ALLOWED');
    });

    it('should reject duplicate email with generic response (Phase 4)', async () => {
      // First registration
      await request(httpServer).post('/api/auth/register').send({
        email: 'test@ualberta.ca',
        username: 'testuser1',
        password: 'SecurePass123!',
        firstName: 'Test',
      });

      // Duplicate email - Phase 4: Returns generic 201 to prevent enumeration
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'test@ualberta.ca',
          username: 'testuser2',
          password: 'SecurePass123!',
          firstName: 'Test',
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeNull();
      expect(response.body.message).toContain('If your account exists');
    });

    it('should reject short password (Phase 4: 12 chars min)', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'test@ualberta.ca',
          username: 'testuser',
          password: 'Short1!',
          firstName: 'Test',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(httpServer).post('/api/auth/register').send({
        email: 'test@ualberta.ca',
        username: 'testuser',
        password: 'SecurePass123!',
        firstName: 'Test',
      });
    });

    it('should reject login before email verification with generic error (Phase 4)', async () => {
      const response = await request(httpServer).post('/api/auth/login').send({
        email: 'test@ualberta.ca',
        password: 'SecurePass123!',
      });

      expect(response.status).toBe(401);
      // Phase 4: Returns INVALID_CREDENTIALS instead of EMAIL_NOT_VERIFIED
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should login successfully after verification', async () => {
      // Manually verify email (bypass token verification for testing)
      await prisma.user.updateMany({
        where: { email: 'test@ualberta.ca' },
        data: { emailVerified: true },
      });

      // Login
      const response = await request(httpServer).post('/api/auth/login').send({
        email: 'test@ualberta.ca',
        password: 'SecurePass123',
      });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.tokenType).toBe('Bearer');
      expect(response.body.user.emailVerified).toBe(true);
    });

    it('should reject invalid password', async () => {
      await prisma.user.updateMany({
        where: { email: 'test@ualberta.ca' },
        data: { emailVerified: true },
      });

      const response = await request(httpServer).post('/api/auth/login').send({
        email: 'test@ualberta.ca',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user', async () => {
      const response = await request(httpServer).post('/api/auth/login').send({
        email: 'nonexistent@ualberta.ca',
        password: 'SecurePass123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should return generic response (prevents enumeration)', async () => {
      const response = await request(httpServer)
        .post('/api/auth/resend-verification')
        .send({
          email: 'nonexistent@gmail.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account exists');
    });

    it('should resend verification for existing unverified user', async () => {
      // Register user (unverified)
      await request(httpServer).post('/api/auth/register').send({
        email: 'test@ualberta.ca',
        username: 'testuser',
        password: 'SecurePass123',
        firstName: 'Test',
      });

      const response = await request(httpServer)
        .post('/api/auth/resend-verification')
        .send({
          email: 'test@ualberta.ca',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should reject invalid token', async () => {
      const response = await request(httpServer)
        .post('/api/auth/verify-email')
        .send({
          token: 'invalid-token-12345',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('TOKEN_INVALID');
    });

    it('should require token', async () => {
      const response = await request(httpServer).post('/api/auth/verify-email').send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_INPUT');
    });
  });

  describe('Email Enumeration Prevention', () => {
    it('register should not reveal if email exists', async () => {
      // First registration
      await request(httpServer).post('/api/auth/register').send({
        email: 'existing@ualberta.ca',
        username: 'existing',
        password: 'SecurePass123!',
        firstName: 'Existing',
      });

      // Duplicate attempt
      const duplicate = await request(httpServer).post('/api/auth/register').send({
        email: 'existing@ualberta.ca',
        username: 'newuser',
        password: 'SecurePass123!',
        firstName: 'New',
      });

      // Should still return 201 with generic message
      expect(duplicate.status).toBe(201);
      expect(duplicate.body.message).toContain('If your account exists');
      expect(duplicate.body.user).toBeNull();
    });

    it('login should not differentiate unverified vs invalid', async () => {
      // Register but don't verify
      await request(httpServer).post('/api/auth/register').send({
        email: 'unverified@ualberta.ca',
        username: 'unverified',
        password: 'SecurePass123!',
        firstName: 'Unverified',
      });

      // Attempt login with unverified account
      const unverified = await request(httpServer).post('/api/auth/login').send({
        email: 'unverified@ualberta.ca',
        password: 'SecurePass123!',
      });

      // Attempt login with non-existent account
      const nonexistent = await request(httpServer).post('/api/auth/login').send({
        email: 'nonexistent@ualberta.ca',
        password: 'SecurePass123!',
      });

      expect(unverified.status).toBe(401);
      expect(unverified.body.code).toBe('INVALID_CREDENTIALS');
      expect(nonexistent.status).toBe(401);
      expect(nonexistent.body.code).toBe('INVALID_CREDENTIALS');
      expect(unverified.body.message).toBe(nonexistent.body.message);
    });
  });

  describe('Password Policy', () => {
    it('should reject passwords shorter than 12 characters', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'test@ualberta.ca',
          username: 'testuser',
          password: 'Short1!',
          firstName: 'Test',
        });

      expect(response.status).toBe(400);
    });

    it('should reject passwords without complexity', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'test@ualberta.ca',
          username: 'testuser',
          password: 'alllowercase123',
          firstName: 'Test',
        });

      expect(response.status).toBe(400);
    });

    it('should accept valid complex passwords', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'test@ualberta.ca',
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.emailVerified).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should block login after 5 attempts', async () => {
      // Register verified user
      await request(httpServer).post('/api/auth/register').send({
        email: 'ratelimit@ualberta.ca',
        username: 'ratelimit',
        password: 'SecurePass123!',
        firstName: 'Rate',
      });
      await prisma.user.updateMany({
        where: { email: 'ratelimit@ualberta.ca' },
        data: { emailVerified: true },
      });

      // 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(httpServer).post('/api/auth/login').send({
          email: 'ratelimit@ualberta.ca',
          password: 'WrongPassword123!',
        });
      }

      // 6th should be rate limited
      const response = await request(httpServer).post('/api/auth/login').send({
        email: 'ratelimit@ualberta.ca',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('TOO_MANY_REQUESTS');
    });

    it('should block register after 3 attempts', async () => {
      for (let i = 0; i < 3; i++) {
        await request(httpServer).post('/api/auth/register').send({
          email: `test${i}@ualberta.ca`,
          username: `testuser${i}`,
          password: 'SecurePass123!',
          firstName: 'Test',
        });
      }

      const response = await request(httpServer).post('/api/auth/register').send({
        email: 'test4@ualberta.ca',
        username: 'testuser4',
        password: 'SecurePass123!',
        firstName: 'Test',
      });

      expect(response.status).toBe(429);
    });
  });
});
