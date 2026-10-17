import { Prisma } from '../lib/prisma.js';
import { UserRole } from '../generated/prisma/enums.js';
import type { ClientUserRole } from '../interfaces/auth.interface.js';

export const USER_ROLE_TO_CLIENT: Record<UserRole, ClientUserRole> = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.FACILITY_MANAGER]: 'facility_manager',
  [UserRole.AUDITOR]: 'auditor',
};

/**
 * Safely parses any raw string/unknown from Better Auth into a valid Prisma UserRole enum.
 * Logs a warning on unknown roles and safely falls back to FACILITY_MANAGER.
 */
export function safeParseUserRole(rawRole: unknown): UserRole {
  if (typeof rawRole !== 'string') {
    console.warn(`[User Role Sync]: Non-string role encountered (${typeof rawRole}). Falling back to FACILITY_MANAGER.`);
    return UserRole.FACILITY_MANAGER;
  }
  const normalized = rawRole.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (normalized === 'admin' || normalized === 'administrator') return UserRole.ADMIN;
  if (normalized === 'auditor') return UserRole.AUDITOR;
  if (normalized === 'facility_manager' || normalized === 'facilitymanager') return UserRole.FACILITY_MANAGER;

  console.warn(`[User Role Sync]: Unknown role "${rawRole}" encountered. Falling back to FACILITY_MANAGER.`);
  return UserRole.FACILITY_MANAGER;
}

/**
 * Type guard for Prisma known request errors without using `any`.
 */
export function isPrismaKnownRequestError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}
