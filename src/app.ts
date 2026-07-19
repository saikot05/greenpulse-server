// Polyfill missing browser globals for pdfjs-dist compatibility in Node.js
(globalThis as any).DOMMatrix = (globalThis as any).DOMMatrix || class DOMMatrix {};
(globalThis as any).Path2D = (globalThis as any).Path2D || class Path2D {};
(globalThis as any).ImageData = (globalThis as any).ImageData || class ImageData {};

import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { requestLogger } from './middlewares/logger.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { mainRouter } from './routes/index.js';

const app = express();

// CORS middleware configurations
app.use(
  cors({
    origin: config.CORS_ORIGIN,
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
