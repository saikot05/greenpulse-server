import type { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import type { JWTPayload, JWTVerifyGetKey } from 'jose-cjs';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.model.js';
import { prisma } from '../lib/prisma.js';
import {
  safeParseUserRole,
  isPrismaKnownRequestError,
  USER_ROLE_TO_CLIENT,
} from '../utils/prisma-helpers.js';
import type { AuthenticatedRequest, AuthenticatedUser } from '../interfaces/auth.interface.js';

/**
 * Lazy-initialised, module-level JWKS cache.
 * Better Auth JWT plugin uses asymmetric keys (EdDSA / Ed25519 by default).
 * The public keys are exposed at <BETTER_AUTH_URL>/api/auth/jwks.
 * We cache the RemoteJWKSet so the public key is only fetched once
 * (and re-fetched automatically if the kid rotates).
 */
let _jwksSet: JWTVerifyGetKey | null = null;
let _jwksBaseUrl = '';

async function getRemoteJWKS(authBaseUrl: string): Promise<JWTVerifyGetKey> {
  // Re-create the set only if the base URL has changed (shouldn't happen in production)
  if (!_jwksSet || _jwksBaseUrl !== authBaseUrl) {
    const { createRemoteJWKSet } = await import('jose-cjs');
    _jwksSet = createRemoteJWKSet(new URL(`${authBaseUrl}/api/auth/jwks`));
    _jwksBaseUrl = authBaseUrl;
  }
  return _jwksSet;
}

/**
 * Resolves a user from PostgreSQL, or JIT syncs them from MongoDB Better Auth collection.
 * Uses findUnique first to avoid unnecessary database writes on active sessions.
 */
async function resolveAndSyncUser(userId: string): Promise<AuthenticatedUser> {
  // 1. Check PostgreSQL first (zero-write fast path)
  let pgUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  // 2. If missing in Postgres, JIT sync from MongoDB Better Auth 'user' collection
  if (!pgUser) {
    const mongoUser = await User.findById(userId);
    if (!mongoUser) {
      throw new AppError('Unauthorized: User associated with this token no longer exists.', 401);
    }

    // NOTE: Role is synced once on first login (known limitation).
    // Subsequent role changes in Better Auth / MongoDB will not automatically propagate
    // to PostgreSQL unless explicitly synchronized.
    const role = safeParseUserRole(mongoUser.role);

    try {
      pgUser = await prisma.user.create({
        data: {
          id: String(mongoUser._id),
          email: mongoUser.email,
          name: mongoUser.name,
          avatarUrl: mongoUser.avatarUrl ?? null,
          role,
          organization: mongoUser.organization ?? null,
        },
      });
    } catch (error: unknown) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2002') {
        const target = error.meta?.target;
        const isEmailConflict =
          (Array.isArray(target) && target.includes('email')) ||
          (typeof target === 'string' && target.includes('email'));

        if (isEmailConflict) {
          console.error(
            '[User Sync Conflict]: A user with this email address already exists in PostgreSQL under a different ID.'
          );
          throw new AppError(
            'Account conflict: A user with this email already exists in the system.',
            409
          );
        }

        // Id race condition: another concurrent request created the record first; reload it
        pgUser = await prisma.user.findUnique({
          where: { id: userId },
        });
        if (!pgUser) {
          throw new AppError('Internal Server Error: Failed to resolve user after concurrent creation.', 500);
        }
      } else {
        throw error;
      }
    }
  }

  // 3. Construct authenticated user with _id alias and client-compatible role
  return {
    id: pgUser.id,
    _id: pgUser.id,
    email: pgUser.email,
    name: pgUser.name,
    avatarUrl: pgUser.avatarUrl,
    role: USER_ROLE_TO_CLIENT[pgUser.role],
    organization: pgUser.organization,
    createdAt: pgUser.createdAt,
    updatedAt: pgUser.updatedAt,
  };
}

/**
 * Handles database resolution and sync errors without exposing sensitive credentials,
 * connection strings, or masking database outages as auth failures.
 */
function handleUserSyncError(syncError: unknown, next: NextFunction): void {
  if (syncError instanceof AppError) {
    return next(syncError);
  }

  const errorName = syncError instanceof Error ? syncError.name : 'UnknownError';
  const prismaCode = isPrismaKnownRequestError(syncError) ? ` [${syncError.code}]` : '';

  console.error(`[Auth Middleware] User resolution/sync failed: ${errorName}${prismaCode}`);
  return next(new AppError('Internal Server Error: Failed to resolve user account.', 500));
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
      let verifiedPayload: JWTPayload | null = null;

      try {
        const { jwtVerify } = await import('jose-cjs');

        const authBaseUrl =
          process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

        const JWKS = await getRemoteJWKS(authBaseUrl);

        const { payload } = await jwtVerify(token, JWKS, {
          issuer: authBaseUrl,
          audience: authBaseUrl,
        });

        verifiedPayload = payload;
      } catch (jwtError: unknown) {
        const errorMsg = jwtError instanceof Error ? jwtError.message : String(jwtError);
        console.warn(
          '[Auth Middleware] JWT verification failed, falling back to session lookup:',
          errorMsg
        );
        // Fall through to opaque session token verification below
      }

      if (verifiedPayload) {
        const userId = verifiedPayload.sub;
        if (!userId) {
          return next(new AppError('Unauthorized: JWT is missing subject claim.', 401));
        }

        try {
          req.user = await resolveAndSyncUser(userId);
          return next();
        } catch (syncError: unknown) {
          return handleUserSyncError(syncError, next);
        }
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
    try {
      req.user = await resolveAndSyncUser(userId);
      return next();
    } catch (syncError: unknown) {
      return handleUserSyncError(syncError, next);
    }
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
