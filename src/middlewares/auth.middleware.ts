import type { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.model.js';
import type { AuthenticatedRequest } from '../interfaces/auth.interface.js';

/**
 * Lazy-initialised, module-level JWKS cache.
 * Better Auth JWT plugin uses asymmetric keys (EdDSA / Ed25519 by default).
 * The public keys are exposed at <BETTER_AUTH_URL>/api/auth/jwks.
 * We cache the RemoteJWKSet so the public key is only fetched once
 * (and re-fetched automatically if the kid rotates).
 */
let _jwksSet: any = null;
let _jwksBaseUrl = '';

async function getRemoteJWKS(authBaseUrl: string) {
  // Re-create the set only if the base URL has changed (shouldn't happen in production)
  if (!_jwksSet || _jwksBaseUrl !== authBaseUrl) {
    const { createRemoteJWKSet } = await import('jose-cjs');
    _jwksSet = createRemoteJWKSet(new URL(`${authBaseUrl}/api/auth/jwks`));
    _jwksBaseUrl = authBaseUrl;
  }
  return _jwksSet;
}

/**
 * Authentication Middleware.
 *
 * Token resolution priority:
 *   1. Authorization: Bearer <token> header
 *   2. better-auth.session_token cookie
 *
 * Token verification strategy:
 *   A. If the token looks like a JWT (three Base64URL segments separated by dots),
 *      verify it via the Better Auth JWKS endpoint (asymmetric, stateless).
 *      - Uses `BETTER_AUTH_URL` env var to locate the /api/auth/jwks endpoint.
 *      - Falls back to session-DB lookup if JWKS verification fails.
 *   B. Otherwise treat it as a Better Auth opaque session token
 *      (format: <id>.<signature>) and look it up in the MongoDB "session" collection.
 */
export const auth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = '';

    // 1. Authorization header takes priority
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1] ?? '';
    }

    // 2. Fallback: parse session cookie
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
        const [key, ...rest] = c.trim().split('=');
        const val = rest.join('='); // handle values that contain '='
        if (key && val) acc[key.trim()] = decodeURIComponent(val);
        return acc;
      }, {} as Record<string, string>);

      // Handle both plain and __Secure- prefixed cookie names
      token =
        cookies['__Secure-better-auth.session_token'] ??
        cookies['better-auth.session_token'] ??
        '';
    }

    if (!token) {
      return next(
        new AppError('Unauthorized: No authentication token found. Please sign in.', 401)
      );
    }

    // ── A. JWT path (three-segment token) ─────────────────────────────────────
    const isJwt = token.split('.').length === 3;

    if (isJwt) {
      try {
        const { jwtVerify } = await import('jose-cjs');

        // BETTER_AUTH_URL is the URL of the Next.js frontend that runs Better Auth
        // e.g. "https://greenpulse-client.vercel.app" in production
        //      "http://localhost:3000" in development
        const authBaseUrl =
          process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

        const JWKS = await getRemoteJWKS(authBaseUrl);

        // issuer and audience both default to BASE_URL in Better Auth
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: authBaseUrl,
          audience: authBaseUrl,
        });

        const userId = payload.sub;
        if (!userId) {
          return next(new AppError('Unauthorized: JWT is missing subject claim.', 401));
        }

        const user = await User.findById(userId);
        if (!user) {
          return next(
            new AppError('Unauthorized: User associated with this token no longer exists.', 401)
          );
        }

        req.user = user;
        return next();
      } catch (jwtError: any) {
        console.warn(
          '[Auth Middleware] JWT verification failed, falling back to session lookup:',
          jwtError.message
        );
        // Fall through to opaque session token verification below
      }
    }

    // ── B. Opaque session token path ──────────────────────────────────────────
    const db = mongoose.connection.db;
    if (!db) {
      return next(
        new AppError('Internal Server Error: Database connection is unavailable.', 500)
      );
    }

    // Better Auth stores the raw token id (before the dot-separated signature)
    const rawToken = token.split('.')[0] ?? '';

    const session = await db.collection('session').findOne({ token: rawToken });
    if (!session) {
      return next(new AppError('Unauthorized: Invalid or expired session.', 401));
    }

    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      return next(
        new AppError('Unauthorized: Session has expired. Please sign in again.', 401)
      );
    }

    const userId = String(session.userId);
    const user = await User.findById(userId);
    if (!user) {
      return next(
        new AppError('Unauthorized: User associated with this session no longer exists.', 401)
      );
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Route guard middleware to restrict endpoint access by user roles.
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      return next(new AppError('Unauthorized: Authentication required.', 401));
    }

    const userRole = user.role.toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) =>
      r.toLowerCase().replace(/[\s_-]+/g, '')
    );
    const matchedRole = normalizedAllowed.some((r) => {
      if (r === 'administrator' || r === 'admin') return userRole === 'admin';
      if (r === 'auditor') return userRole === 'auditor';
      if (r === 'facilitymanager') return userRole === 'facility_manager';
      return userRole === r;
    });

    if (!matchedRole) {
      return next(
        new AppError('Forbidden: You do not have permission to access this resource.', 403)
      );
    }
    next();
  };
};

export default auth;
