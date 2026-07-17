import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/health
 * Returns status, timestamp, process uptime, and resource usage metrics.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: {
      message: 'System is running and healthy.',
      timestamp: new Date().toISOString(),
      uptime: `${process.uptime().toFixed(2)}s`,
      memory: {
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      },
    },
  });
});

export const healthRouter = router;
