import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';

/**
 * Global Error Handler Middleware.
 * Captures operational (AppError) and programming errors, formats them,
 * and responds to the client with environment-aware details.
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let status = 'error';
  let message = 'Internal Server Error';
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    status = err.status;
    message = err.message;
    isOperational = err.isOperational;
  } else if (err instanceof Error) {
    message = err.message;
  }

  // Log full error stack for backend tracking
  console.error(`[Error]: ${err.message}`, err.stack);

  res.status(statusCode).json({
    status,
    message: isOperational || config.NODE_ENV === 'development' ? message : 'Something went wrong!',
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
