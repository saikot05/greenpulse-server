import { Server } from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { connectDB, closeDB } from './config/db.js';

let server: Server;

/**
 * Bootstraps the application by connecting to the database and starting the HTTP listener.
 */
const bootstrap = async (): Promise<void> => {
  // Establish database connection first
  await connectDB();

  // Start Express HTTP listener
  server = app.listen(config.PORT, () => {
    console.log(`[Server]: Listening on port ${config.PORT} in ${config.NODE_ENV} mode.`);
  });
};

/**
 * Standard server cleanup and shutdown procedure.
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`[Server]: Received ${signal}. Initiating graceful shutdown...`);
  
  // Close MongoDB connection
  await closeDB();

  if (server) {
    server.close(() => {
      console.log('[Server]: All connections closed. Exiting process.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force close after 10 seconds timeout
  setTimeout(() => {
    console.error('[Server]: Forced exit due to unresolved connections.');
    process.exit(1);
  }, 10000);
};

// Start the bootstrap process
bootstrap().catch((err: Error) => {
  console.error('[Server]: Fatal bootstrap error:', err.message, err.stack);
  process.exit(1);
});

// Shutdown listeners
process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

// Catch unexpected exceptions or promise rejections globally
process.on('uncaughtException', (err: Error) => {
  console.error('[Uncaught Exception]:', err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Unhandled Rejection]:', reason);
  process.exit(1);
});
