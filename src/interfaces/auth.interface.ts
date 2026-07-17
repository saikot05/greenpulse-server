import type { Request } from 'express';
import type { IUser } from '../models/User.model.js';

/**
 * Custom Express Request interface that includes the authenticated user
 * populated by the auth middleware.
 */
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}
