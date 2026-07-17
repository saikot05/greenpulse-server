import multer from 'multer';
import type { Request } from 'express';
import { AppError } from '../utils/AppError.js';

// Multer memory storage holds the file in buffer format
const storage = multer.memoryStorage();

// Accept only images (JPEG, PNG, WebP) and PDFs
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Unsupported file format. Please upload a JPEG, PNG, WebP image or a PDF document.',
        400
      )
    );
  }
};

/**
 * Multer middleware config for utility bill file uploads.
 * File size limit: 5MB.
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export default upload;
