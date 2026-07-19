

import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { requestLogger } from './middlewares/logger.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { mainRouter } from './routes/index.js';

const app = express();

// CORS middleware configurations
// CORS_ORIGIN supports comma-separated list for multiple origins
// e.g. "http://localhost:3000,https://greenpulse-client.vercel.app"
const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin '${origin}' is not allowed.`));
    },
    credentials: true,
  })
);

// Standard JSON body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom Request Logger middleware
app.use(requestLogger);

// API Route Mountpoint (/api/v1)
app.use('/api', mainRouter);

// Catch 404 Route Not Found errors
app.use(notFoundHandler);

// Centralized Global Error Handler
app.use(errorHandler);

export default app;
