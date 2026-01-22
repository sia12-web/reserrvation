import request from 'supertest';
import { httpServer } from '../../src/app';
import { prisma } from '../../src/config/database';

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
          password: 'SecurePass123',
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
          password: 'SecurePass123',
          firstName: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('DOMAIN_NOT_ALLOWED');
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(httpServer).post('/api/auth/register').send({
        email: 'test@ualberta.ca',
        username: 'testuser1',
        password: 'SecurePass123',
        firstName: 'Test',
      });

      // Duplicate email
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'test@ualberta.ca',
          username: 'testuser2',
          password: 'SecurePass123',
          firstName: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('EMAIL_EXISTS');
    });

    it('should reject short password', async () => {
      const response = await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'test@ualberta.ca',
          username: 'testuser',
          password: 'Short1',
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
        password: 'SecurePass123',
        firstName: 'Test',
      });
    });

    it('should reject login before email verification', async () => {
      const response = await request(httpServer).post('/api/auth/login').send({
        email: 'test@ualberta.ca',
        password: 'SecurePass123',
      });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('EMAIL_NOT_VERIFIED');
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
        password: 'WrongPassword123',
      });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user', async () => {
      const response = await request(httpServer).post('/api/auth/login').send({
        email: 'nonexistent@ualberta.ca',
        password: 'SecurePass123',
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
});
