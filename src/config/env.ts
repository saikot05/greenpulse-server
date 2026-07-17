import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

export interface Config {
  PORT: number;
  NODE_ENV: string;
  CORS_ORIGIN: string;
  MONGO_URI: string;
}

/**
 * Validates environment variables.
 * Serves as a placeholder for a schema validation library like Zod or Joi.
 */
const validateEnv = (): Config => {
  const rawPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/greenpulse';

  if (isNaN(rawPort)) {
    throw new Error('Environment validation error: PORT environment variable must be a valid number.');
  }

  // Placeholder check for production requirements
  if (NODE_ENV === 'production' && !process.env.MONGO_URI) {
    console.warn('[Warning]: MONGO_URI is not explicitly defined in a production environment.');
  }

  return {
    PORT: rawPort,
    NODE_ENV,
    CORS_ORIGIN,
    MONGO_URI,
  };
};

export const config = validateEnv();
