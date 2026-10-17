import type { Request } from 'express';

export type ClientUserRole = 'admin' | 'facility_manager' | 'auditor';

export interface AuthenticatedUser {
  id: string;
  _id: string; // Alias for id so existing Mongo-oriented code continues to work seamlessly
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: ClientUserRole;
  organization?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Custom Express Request interface that includes the authenticated user
 * populated by the auth middleware.
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
