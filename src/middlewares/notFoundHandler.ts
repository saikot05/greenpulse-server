import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

/**
 * Not Found Middleware.
 * Captures all unmatched routes, instantiates a 404 AppError, and passes it forward.
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Resource not found: ${req.method} ${req.originalUrl}`, 404));
};
