import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ZodTypeAny, ZodIssue } from 'zod';
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
        const parsedParams = schema.params.parse(req.params);
        Object.defineProperty(req, 'params', {
          value: parsedParams,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schema.query) {
        const parsedQuery = schema.query.parse(req.query);
        Object.defineProperty(req, 'query', {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schema.body) {
        req.body = schema.body.parse(req.body) as typeof req.body;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue: ZodIssue) => {
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
