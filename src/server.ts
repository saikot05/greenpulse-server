import app from './app.js';
import { config } from './config/index.js';

/**
 * Start the application server on the configured port.
 */
const server = app.listen(config.PORT, () => {
  console.log(`[Server]: Listening on port ${config.PORT} in ${config.NODE_ENV} mode.`);
});

/**
 * Standard server cleanup and shutdown procedure.
 */
const gracefulShutdown = (signal: string): void => {
  console.log(`[Server]: Received ${signal}. Initiating graceful shutdown...`);
  
  server.close(() => {
    console.log('[Server]: All connections closed. Exiting process.');
    process.exit(0);
  });

  // Force close after 10 seconds timeout
  setTimeout(() => {
    console.error('[Server]: Forced exit due to unresolved connections.');
    process.exit(1);
  }, 10000);
};

// Shutdown listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unexpected exceptions or promise rejections globally
process.on('uncaughtException', (err: Error) => {
  console.error('[Uncaught Exception]:', err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Unhandled Rejection]:', reason);
  process.exit(1);
});
