// Polyfill missing browser globals for pdfjs-dist/pdf-parse in serverless environments
globalThis.DOMMatrix = globalThis.DOMMatrix || class DOMMatrix {};
globalThis.Path2D = globalThis.Path2D || class Path2D {};
globalThis.ImageData = globalThis.ImageData || class ImageData {};

// Dynamically import dependencies to ensure polyfills run before modules are loaded
const { default: app } = await import('../dist/app.js');
const { connectDB } = await import('../dist/config/db.js');
const { seedDatabase } = await import('../dist/config/seed.js');

let isConnected = false;

export default async (req, res) => {
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
