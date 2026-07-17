import type mongoose from 'mongoose';
import { BaseRepository } from './base.repository.js';
import { EsgAudit } from '../models/EsgAudit.model.js';
import type { IEsgAudit, FacilityType, RiskRating, ScopeCategory } from '../models/EsgAudit.model.js';
import { AppError } from '../utils/AppError.js';

export interface AuditQueryParams {
  page: number;
  limit: number;
  search?: string;
  facilityType?: FacilityType;
  riskRating?: RiskRating;
  auditYear?: number;
  scopeCategory?: ScopeCategory;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  results: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Repository layer for ESG Audit Entities.
 * Inherits generic CRUD operations from BaseRepository and implements
 * custom multi-field query, debounced search, and pagination.
 */
export class EsgAuditRepository extends BaseRepository<IEsgAudit> {
  constructor() {
    super(EsgAudit);
  }

  /**
   * Fetch paginated ESG Audits matching search filters, sort criteria, and keywords.
   */
  public async findWithFilters(query: AuditQueryParams): Promise<PaginatedResult<IEsgAudit>> {
    try {
      const {
        page,
        limit,
        search,
        facilityType,
        riskRating,
        auditYear,
        scopeCategory,
        sortBy,
        sortOrder,
      } = query;

      const filter: mongoose.QueryFilter<IEsgAudit> = {};

      // Direct multi-field filters using strict typings
      if (facilityType) {
        filter.facilityType = facilityType;
      }
      if (riskRating) {
        filter.riskRating = riskRating;
      }
      if (auditYear) {
        filter.auditYear = auditYear;
      }
      if (scopeCategory) {
        filter.scopeCategory = scopeCategory;
      }

      // Case-insensitive regex keyword searches
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { facilityName: { $regex: search, $options: 'i' } },
          { shortDescription: { $regex: search, $options: 'i' } },
        ];
      }

      // Calculate index offset
      const skip = (page - 1) * limit;

      // Fetch documents and count totals in parallel
      const [results, total] = await Promise.all([
        this.model
          .find(filter)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.model.countDocuments(filter).exec(),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        results,
        total,
        page,
        limit,
        pages,
      };
    } catch (error) {
      throw new AppError(
        `Database query failed: Unable to fetch filtered ESG Audits. Reason: ${(error as Error).message}`,
        500
      );
    }
  }
}
export default EsgAuditRepository;
