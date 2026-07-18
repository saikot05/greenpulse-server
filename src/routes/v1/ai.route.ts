import { Router } from 'express';
import { aiController, uploadMiddleware } from '../../controllers/ai.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';

export const aiRouter = Router();

/**
 * Route: POST /api/v1/ai/parse-bill
 * Description: Protected endpoint to upload a utility bill image/PDF and parse it via Gemini AI.
 */
aiRouter.post(
  '/parse-bill',
  auth,
  uploadMiddleware.single('file'),
  aiController.parseBill
);

/**
 * Route: POST /api/v1/ai/chat
 * Description: Protected. Chat with the Net-Zero sustainability agent, keeping MongoDB history.
 */
aiRouter.post(
  '/chat',
  auth,
  aiController.chatWithAgent
);

/**
 * Route: GET /api/v1/ai/chat/history
 * Description: Protected. Retrieves chat logs by sessionId.
 */
aiRouter.get(
  '/chat/history',
  auth,
  aiController.getChatHistory
);

/**
 * Route: POST /api/v1/ai/analyze-data
 * Description: Protected. Upload energy telemetry CSV/JSON file to perform carbon analysis.
 */
aiRouter.post(
  '/analyze-data',
  auth,
  uploadMiddleware.single('file'),
  aiController.analyzeTelemetryData
);

aiRouter.post(
  '/analyze-telemetry',
  auth,
  uploadMiddleware.single('file'),
  aiController.analyzeTelemetry
);

export default aiRouter;
