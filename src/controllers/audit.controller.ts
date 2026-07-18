import type { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { esgAuditRepository } from '../repositories/index.js';
import { aiService } from '../services/ai.service.js';
import { AppError } from '../utils/AppError.js';
import type { AuthenticatedRequest } from '../interfaces/auth.interface.js';

function getFacilityFallbackImage(type: string): string {
  switch (type) {
    case 'Corporate Office':
      return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
    case 'Manufacturing':
      return 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800';
    case 'Logistics Hub':
      return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800';
    case 'Data Center':
      return 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800';
    case 'Retail Store':
      return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800';
    default:
      return 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800';
  }
}

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

      // 3. Auto-assign fallback image if not provided
      if (!auditData.imageUrl) {
        auditData.imageUrl = getFacilityFallbackImage(auditData.facilityType);
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

      if (result && Array.isArray(result.results)) {
        result.results = result.results.map((audit: any) => {
          const plainAudit = audit.toObject ? audit.toObject() : audit;
          if (!plainAudit.imageUrl) {
            plainAudit.imageUrl = getFacilityFallbackImage(plainAudit.facilityType);
          }
          return plainAudit;
        });
      }

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

      const plainAudit = audit.toObject ? audit.toObject() : audit;
      if (!plainAudit.imageUrl) {
        plainAudit.imageUrl = getFacilityFallbackImage(plainAudit.facilityType);
      }

      res.status(200).json({
        status: 'success',
        data: plainAudit,
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
