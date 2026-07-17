import mongoose from 'mongoose';
import { config } from './index.js';

/**
 * Connects to MongoDB database using Mongoose.
 * Installs connection event listeners and configures pool constraints.
 */
export const connectDB = async (): Promise<void> => {
  const mongoUri = config.MONGO_URI;

  // Bind lifecycle listeners to Mongoose connection
  mongoose.connection.on('connected', () => {
    console.log('[Database]: MongoDB connection established successfully.');
  });

  mongoose.connection.on('error', (err: Error) => {
    console.error('[Database]: MongoDB connection runtime error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('[Database]: MongoDB connection disconnected.');
  });

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
    });
  } catch (err) {
    console.error('[Database]: Critical error establishing initial MongoDB connection:', err);
    process.exit(1);
  }
};

/**
 * Closes MongoDB Mongoose connection gracefully during teardown.
 */
export const closeDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close();
      console.log('[Database]: MongoDB connection closed cleanly.');
    } catch (err) {
      console.error('[Database]: Error encountered while closing MongoDB connection:', err);
    }
  }
};
