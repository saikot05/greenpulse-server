import type { Request, Response, NextFunction } from 'express';

/**
 * Custom Request Logger Middleware.
 * Logs the request method, URL, final status code, response time, and remote address.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime();
  const timestamp = new Date().toISOString();

  // Listen to response finish event to log complete request cycle
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const ip = req.ip || req.socket.remoteAddress || '-';
    
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${durationInMs}ms - IP: ${ip}`
    );
  });

  next();
};
