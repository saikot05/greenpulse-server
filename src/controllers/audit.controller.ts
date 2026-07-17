import type { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { esgAuditRepository } from '../repositories/index.js';
import { aiService } from '../services/ai.service.js';
import { AppError } from '../utils/AppError.js';
import type { AuthenticatedRequest } from '../interfaces/auth.interface.js';

export class AuditController {
  /**
   * Endpoint: POST /api/v1/audits
   * Protected. Creates a new ESG Audit with Gemini tags and insights auto-generation.
   */
  public createAudit = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        return next(new AppError('Unauthorized: Authentication required.', 401));
      }

      const auditData = req.body;

      // 1. Generate AI tags if not provided or empty
      if (!auditData.tags || !Array.isArray(auditData.tags) || auditData.tags.length === 0) {
        auditData.tags = await aiService.generateAuditTags({
          title: auditData.title,
          facilityName: auditData.facilityName,
          facilityType: auditData.facilityType,
          scopeCategory: auditData.scopeCategory,
          riskRating: auditData.riskRating,
          estimatedCarbonTons: auditData.carbonScoreTons,
          energyUsageKwh: auditData.energyUsageKwh,
        });
      }

      // 2. Generate nested AI insights to satisfy Mongoose validation constraint
      if (!auditData.aiInsights) {
        auditData.aiInsights = await aiService.generateAiInsights({
          title: auditData.title,
          facilityName: auditData.facilityName,
          facilityType: auditData.facilityType,
          scopeCategory: auditData.scopeCategory,
          riskRating: auditData.riskRating,
          estimatedCarbonTons: auditData.carbonScoreTons,
          energyUsageKwh: auditData.energyUsageKwh,
        });
      }

      // Convert creator ID from Better Auth string to Mongoose ObjectId
      const createdBy = new Types.ObjectId(String(user._id));

      const newAudit = await esgAuditRepository.create({
        ...auditData,
        createdBy,
      });

      res.status(201).json({
        status: 'success',
        data: newAudit,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Endpoint: GET /api/v1/audits
   * Fetches paginated, filtered, and sorted audits.
   */
  public getAudits = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // req.query is pre-parsed by the validate(queryAuditSchema) middleware
      const queryParams = req.query as any;

      const result = await esgAuditRepository.findWithFilters(queryParams);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const auditController = new AuditController();
