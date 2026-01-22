import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  userId?: string;
  emailVerified?: boolean;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 'INVALID_CREDENTIALS',
      message: 'Authentication required',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      emailVerified: boolean;
    };

    req.userId = decoded.userId;
    req.emailVerified = decoded.emailVerified;

    next();
  } catch (error) {
    res.status(401).json({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid or expired token',
    });
  }
}
