import type { Request, Response } from 'express';
import { analyzeCarbonDataService } from '../services/carbon.service.js';

export const analyzeCarbonData = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    
    // We expect the payload to have a "data" array containing the records
    if (!payload || !payload.data || !Array.isArray(payload.data)) {
      res.status(400).json({ error: 'Invalid payload. Expected an array of records in "data".' });
      return;
    }

    const analysisResult = await analyzeCarbonDataService(payload.data);
    
    res.status(200).json({
      success: true,
      data: analysisResult
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error'
    });
  }
};
