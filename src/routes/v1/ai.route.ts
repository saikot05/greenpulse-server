import { Router } from 'express';
import { aiController } from '../../controllers/ai.controller.js';
import { upload } from '../../middlewares/upload.middleware.js';
import { auth } from '../../middlewares/auth.middleware.js';

export const aiRouter = Router();

/**
 * Route: POST /api/v1/ai/parse-bill
 * Description: Protected endpoint to upload a utility bill image/PDF and parse it via Gemini AI.
 */
aiRouter.post(
  '/ai/parse-bill',
  auth,
  upload.single('file'),
  aiController.parseBill
);

export default aiRouter;
