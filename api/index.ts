import './polyfills.js';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { seedDatabase } from '../src/config/seed.js';

let isConnected = false;

export default async (req: any, res: any) => {
  if (!isConnected) {
    try {
      await connectDB();
      await seedDatabase();
      isConnected = true;
    } catch (err) {
      console.error('Failed to connect to database in Vercel function:', err);
    }
  }
  return app(req, res);
};
