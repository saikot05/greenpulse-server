import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError.js';

export interface RequestValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Reusable Request Validation Middleware.
 * Validates request body, query, and params against the provided Zod schemas.
 * Formats errors into a single structured, readable string and forwards a 400 Bad Request error.
 */
export const validate = (schema: RequestValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schema.params) {
        req.params = schema.params.parse(req.params) as typeof req.params;
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query) as typeof req.query;
      }
      if (schema.body) {
        req.body = schema.body.parse(req.body) as typeof req.body;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => {
          const path = issue.path.join('.');
          return `${path ? `'${path}': ` : ''}${issue.message}`;
        });
        
        const message = `Validation failed: ${errorMessages.join('; ')}`;
        return next(new AppError(message, 400));
      }
      return next(error);
    }
  };
};
export default validate;
