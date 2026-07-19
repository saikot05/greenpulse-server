// Polyfill missing browser globals for pdfjs-dist/pdf-parse in serverless environments
(globalThis as any).DOMMatrix = (globalThis as any).DOMMatrix || class DOMMatrix {};
(globalThis as any).Path2D = (globalThis as any).Path2D || class Path2D {};
(globalThis as any).ImageData = (globalThis as any).ImageData || class ImageData {};

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
