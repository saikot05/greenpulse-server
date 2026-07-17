import type { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.model.js';
import type { AuthenticatedRequest } from '../interfaces/auth.interface.js';

/**
 * Authentication Middleware.
 * Resolves the Better Auth session token from headers or cookies,
 * queries the MongoDB "session" collection, verifies the expiration,
 * and attaches the authenticated user to the request object.
 */
export const auth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = '';

    // 1. Check Authorization Header (Bearer <token>)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1] ?? '';
    }

    // 2. Fallback to Cookie verification (better-auth.session_token)
    if (!token && req.headers.cookie) {
      // Basic cookie parsing
      const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
        const [key, val] = c.trim().split('=');
        if (key && val) {
          acc[key] = decodeURIComponent(val);
        }
        return acc;
      }, {} as Record<string, string>);

      token = cookies['better-auth.session_token'] ?? '';
    }

    if (!token) {
      return next(new AppError('Unauthorized: No authentication token found. Please sign in.', 401));
    }

    // 3. Directly query MongoDB session collection (configured by Better Auth)
    const db = mongoose.connection.db;
    if (!db) {
      return next(new AppError('Internal Server Error: Database connection is unavailable.', 500));
    }

    // Better Auth signed cookies are in the format: <token>.<signature>
    // The database only stores the first part (raw token).
    const rawToken = token.split('.')[0] ?? '';

    const session = await db.collection('session').findOne({ token: rawToken });
    if (!session) {
      return next(new AppError('Unauthorized: Invalid or expired session.', 401));
    }

    // 4. Verify session expiration date
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      return next(new AppError('Unauthorized: Session has expired. Please sign in again.', 401));
    }

    // 5. Fetch User from the shared MongoDB "user" collection
    // Note: userId in Better Auth is stored as a string or ObjectId.
    // Convert to string or check both.
    const userId = String(session.userId);
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('Unauthorized: User associated with this session no longer exists.', 401));
    }

    // 6. Inject the user into request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default auth;
