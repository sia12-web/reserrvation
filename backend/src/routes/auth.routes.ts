import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validator';

const router = Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email format'),
    body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').optional(),
  ],
  validate,
  authController.register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

// Verify Email
router.post(
  '/verify-email',
  [body('token').notEmpty().withMessage('Token is required')],
  validate,
  authController.verifyEmail
);

// Resend Verification
router.post(
  '/resend-verification',
  [body('email').isEmail().withMessage('Invalid email format')],
  validate,
  authController.resendVerification
);

export default router;
