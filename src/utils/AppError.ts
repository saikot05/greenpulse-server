/**
 * Operational Error class extending standard Error.
 * Used for known, handled errors with appropriate HTTP status codes.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture stack trace excluding this constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}
