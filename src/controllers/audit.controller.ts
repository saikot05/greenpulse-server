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

      // Normalize carbonScoreTons / estimatedCarbonTons
      const carbonTons = auditData.carbonScoreTons ?? auditData.estimatedCarbonTons ?? 0;
      auditData.carbonScoreTons = carbonTons;
      auditData.estimatedCarbonTons = carbonTons;

      // 1. Generate AI tags if not provided or empty
      if (!auditData.tags || !Array.isArray(auditData.tags) || auditData.tags.length === 0) {
        try {
          auditData.tags = await aiService.generateAuditTags({
            title: auditData.title,
            facilityName: auditData.facilityName,
            facilityType: auditData.facilityType,
            scopeCategory: auditData.scopeCategory,
            riskRating: auditData.riskRating,
            estimatedCarbonTons: carbonTons,
            energyUsageKwh: auditData.energyUsageKwh,
          });
        } catch (error) {
          console.warn('[Audit AI Tags Fallback]: Failed to generate tags using AI. Using static defaults.');
          auditData.tags = ['#CarbonAudit', '#Sustainability', `#${auditData.facilityType.replace(/\s+/g, '')}`];
        }
      }

      // 2. Generate nested AI insights to satisfy Mongoose validation constraint
      if (!auditData.aiInsights) {
        try {
          auditData.aiInsights = await aiService.generateAiInsights({
            title: auditData.title,
            facilityName: auditData.facilityName,
            facilityType: auditData.facilityType,
            scopeCategory: auditData.scopeCategory,
            riskRating: auditData.riskRating,
            estimatedCarbonTons: carbonTons,
            energyUsageKwh: auditData.energyUsageKwh,
          });
        } catch (error) {
          console.warn('[Audit AI Insights Fallback]: Failed to generate insights using AI. Using static defaults.');
          auditData.aiInsights = {
            decarbonizationPriority: carbonTons > 100 ? 'High' : carbonTons > 30 ? 'Medium' : 'Low',
            estimatedCostSavingsUsd: Math.round(auditData.energyUsageKwh * 0.12 * 0.15), // estimated 15% savings at $0.12/kWh
            recommendedActions: [
              'Conduct a comprehensive energy audit to identify baseline consumption inefficiencies.',
              'Transition facility lightning and HVAC systems to modern energy-efficient alternatives.',
              'Implement real-time smart metering and sub-metering telemetry monitors.'
            ]
          };
        }
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

  /**
   * Endpoint: GET /api/v1/audits/:id
   * Public. Fetches a specific ESG audit by its ID.
   */
  public getAuditById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const audit = await esgAuditRepository.findById(String(id));

      if (!audit) {
        return next(new AppError('Audit not found.', 404));
      }

      res.status(200).json({
        status: 'success',
        data: audit,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Endpoint: DELETE /api/v1/audits/:id
   * Protected. Deletes a specific ESG audit if it was created by the logged-in user.
   */
  public deleteAudit = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        return next(new AppError('Unauthorized: Authentication required.', 401));
      }

      const { id } = req.params;
      const audit = await esgAuditRepository.findById(String(id));

      if (!audit) {
        return next(new AppError('Audit not found.', 404));
      }

      // Verify ownership: cast MongoDB User ID and audit createdBy to strings for comparison
      if (audit.createdBy.toString() !== String(user._id)) {
        return next(new AppError('Forbidden: You can only delete audits that you created.', 403));
      }

      await esgAuditRepository.deleteById(String(id));

      res.status(200).json({
        status: 'success',
        message: 'Audit deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const auditController = new AuditController();
