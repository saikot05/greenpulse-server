import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async Wrapper Utility.
 * Wraps async Express handlers to catch rejected promises and pass them to the global error handler.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
