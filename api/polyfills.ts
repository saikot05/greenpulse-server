// Polyfill missing browser globals for pdfjs-dist/pdf-parse in serverless environments
(globalThis as any).DOMMatrix = (globalThis as any).DOMMatrix || class DOMMatrix {};
(globalThis as any).Path2D = (globalThis as any).Path2D || class Path2D {};
(globalThis as any).ImageData = (globalThis as any).ImageData || class ImageData {};
