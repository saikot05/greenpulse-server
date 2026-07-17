import type { Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service.js';
import { AppError } from '../utils/AppError.js';
import type { AuthenticatedRequest } from '../interfaces/auth.interface.js';

export class AiController {
  /**
   * Endpoint: POST /api/v1/ai/parse-bill
   * Parses uploaded utility bill file (image/PDF) using Gemini.
   */
  public parseBill = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        return next(new AppError('No utility bill file was uploaded.', 400));
      }

      const parsedData = await aiService.parseUtilityBill(file.buffer, file.mimetype);

      res.status(200).json({
        status: 'success',
        data: parsedData,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const aiController = new AiController();
