import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Completely disable rate limiting in test environment
const skipRateLimiting = env.NODE_ENV === 'test';

// Login: 5 attempts per 15 minutes
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimiting, // Skip all rate limiting in tests
});

// Register: 3 attempts per hour
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many registration attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimiting,
});

// Verify Email: 10 attempts per 15 minutes
export const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many verification attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimiting,
});

// Resend Verification: 3 attempts per hour
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimiting,
});

// Global API: 100 requests per 15 minutes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimiting,
});
