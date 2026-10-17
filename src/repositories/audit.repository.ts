import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../utils/AppError.js';
import { isPrismaKnownRequestError } from '../utils/prisma-helpers.js';
import {
  safeParseFacilityType,
  safeParseScopeCategory,
  safeParseRiskRating,
  safeParseDecarbonizationPriority,
  mapPrismaAuditToClient,
  type MappedEsgAuditResponse,
} from '../utils/audit-mapper.js';

export interface AuditQueryParams {
  page: number;
  limit: number;
  search?: string;
  facilityType?: string;
  riskRating?: string;
  auditYear?: number;
  scopeCategory?: string;
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

export interface CreateAuditInput {
  title: string;
  facilityName: string;
  facilityType: string;
  location: string;
  auditYear: number;
  scopeCategory: string;
  carbonScoreTons: number;
  energyUsageKwh: number;
  riskRating: string;
  shortDescription: string;
  fullOverview: string;
  imageUrl?: string;
  tags?: string[];
  createdBy: string;
  aiInsights?: {
    decarbonizationPriority?: string;
    estimatedCostSavingsUsd?: number;
    recommendedActions?: string[];
  };
}

/**
 * Repository layer for ESG Audit Entities backed by PostgreSQL via Prisma.
 * Implements multi-field queries, debounced text search, pagination, and relation hydration.
 */
export class EsgAuditRepository {
  /**
   * Fetch paginated ESG Audits matching search filters, sort criteria, and keywords.
   */
  public async findWithFilters(
    query: AuditQueryParams
  ): Promise<PaginatedResult<MappedEsgAuditResponse>> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        facilityType,
        riskRating,
        auditYear,
        scopeCategory,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const where: Prisma.EsgAuditWhereInput = {};

      if (facilityType) {
        try {
          where.facilityType = safeParseFacilityType(facilityType);
        } catch {
          // If unparseable enum filter, ignore
        }
      }

      if (riskRating) {
        try {
          where.riskRating = safeParseRiskRating(riskRating);
        } catch {
          // Ignore
        }
      }

      if (scopeCategory) {
        try {
          where.scopeCategory = safeParseScopeCategory(scopeCategory);
        } catch {
          // Ignore
        }
      }

      if (auditYear && !isNaN(Number(auditYear))) {
        where.auditYear = Number(auditYear);
      }

      if (search && search.trim()) {
        const term = search.trim();
        where.OR = [
          { title: { contains: term, mode: 'insensitive' } },
          { facilityName: { contains: term, mode: 'insensitive' } },
          { shortDescription: { contains: term, mode: 'insensitive' } },
        ];
      }

      const allowedSortFields = [
        'title',
        'facilityName',
        'auditYear',
        'carbonScoreTons',
        'energyUsageKwh',
        'createdAt',
        'updatedAt',
      ];
      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const order = sortOrder === 'asc' ? 'asc' : 'desc';

      const skip = (Math.max(1, page) - 1) * limit;

      const [results, total] = await Promise.all([
        prisma.esgAudit.findMany({
          where,
          include: {
            tags: true,
            aiInsight: true,
          },
          orderBy: { [validSortBy]: order },
          skip,
          take: limit,
        }),
        prisma.esgAudit.count({ where }),
      ]);

      const mappedResults = results.map(mapPrismaAuditToClient);
      const pages = Math.ceil(total / limit) || 1;

      return {
        results: mappedResults,
        total,
        page,
        limit,
        pages,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Database query failed: Unable to fetch filtered ESG Audits. Reason: ${(error as Error).message}`,
        500
      );
    }
  }

  /**
   * Fetch a single audit by ID with tags and AI insight relations.
   */
  public async findById(id: string): Promise<MappedEsgAuditResponse | null> {
    try {
      const audit = await prisma.esgAudit.findUnique({
        where: { id },
        include: {
          tags: true,
          aiInsight: true,
        },
      });

      return audit ? mapPrismaAuditToClient(audit) : null;
    } catch (error) {
      throw new AppError(
        `Database operation failed: FindById query failed. Reason: ${(error as Error).message}`,
        500
      );
    }
  }

  /**
   * Create a new ESG Audit with nested relations (tags connectOrCreate, aiInsight create).
   */
  public async create(data: CreateAuditInput): Promise<MappedEsgAuditResponse> {
    try {
      const facilityType = safeParseFacilityType(data.facilityType);
      const scopeCategory = safeParseScopeCategory(data.scopeCategory);
      const riskRating = safeParseRiskRating(data.riskRating);
      const decarbPriority = safeParseDecarbonizationPriority(
        data.aiInsights?.decarbonizationPriority
      );

      const tagConnectOrCreate = (data.tags || []).map((name: string) => {
        const cleanName = name.trim();
        return {
          where: { name: cleanName },
          create: { name: cleanName },
        };
      });

      const audit = await prisma.esgAudit.create({
        data: {
          title: data.title,
          facilityName: data.facilityName,
          facilityType,
          location: data.location,
          auditYear: Number(data.auditYear),
          scopeCategory,
          carbonScoreTons: data.carbonScoreTons,
          energyUsageKwh: data.energyUsageKwh,
          riskRating,
          shortDescription: data.shortDescription,
          fullOverview: data.fullOverview,
          imageUrl: data.imageUrl ?? null,
          createdBy: data.createdBy,
          tags: {
            connectOrCreate: tagConnectOrCreate,
          },
          aiInsight: {
            create: {
              decarbonizationPriority: decarbPriority,
              estimatedCostSavingsUsd: data.aiInsights?.estimatedCostSavingsUsd ?? 0,
              recommendedActions: data.aiInsights?.recommendedActions ?? [],
            },
          },
        },
        include: {
          tags: true,
          aiInsight: true,
        },
      });

      return mapPrismaAuditToClient(audit);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Database operation failed: Unable to create audit record. Reason: ${(error as Error).message}`,
        500
      );
    }
  }

  /**
   * Delete an ESG Audit by ID.
   */
  public async deleteById(id: string): Promise<boolean> {
    try {
      await prisma.esgAudit.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2025') {
        return false;
      }
      throw new AppError(
        `Database operation failed: DeleteById failed. Reason: ${(error as Error).message}`,
        500
      );
    }
  }

  /**
   * Find audits with optional user filter (used by AI copilot services).
   */
  public async find(filter?: { createdBy?: unknown }): Promise<MappedEsgAuditResponse[]> {
    try {
      const where: Prisma.EsgAuditWhereInput = {};
      if (filter?.createdBy) {
        where.createdBy = String(filter.createdBy);
      }

      const audits = await prisma.esgAudit.findMany({
        where,
        include: {
          tags: true,
          aiInsight: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return audits.map(mapPrismaAuditToClient);
    } catch (error) {
      throw new AppError(
        `Database operation failed: Find query failed. Reason: ${(error as Error).message}`,
        500
      );
    }
  }
}

export default EsgAuditRepository;
