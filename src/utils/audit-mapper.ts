import {
  FacilityType,
  ScopeCategory,
  RiskRating,
  DecarbonizationPriority,
} from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AppError } from './AppError.js';

export type ClientFacilityType =
  | 'Manufacturing'
  | 'Data Center'
  | 'Corporate Office'
  | 'Logistics Hub'
  | 'Retail Store';

export type ClientScopeCategory =
  | 'Scope 1 (Direct)'
  | 'Scope 2 (Indirect Energy)'
  | 'Scope 3 (Value Chain)';

export type ClientRiskRating =
  | 'Low Carbon'
  | 'Moderate Impact'
  | 'High Emissions'
  | 'Critical Failure';

export type ClientDecarbonizationPriority = 'High' | 'Medium' | 'Low';

// ─── Prisma Enums to Client Display Strings ───────────────────────────────────

export const FACILITY_TYPE_PRISMA_TO_CLIENT: Record<FacilityType, ClientFacilityType> = {
  [FacilityType.MANUFACTURING]: 'Manufacturing',
  [FacilityType.DATA_CENTER]: 'Data Center',
  [FacilityType.CORPORATE_OFFICE]: 'Corporate Office',
  [FacilityType.LOGISTICS_HUB]: 'Logistics Hub',
  [FacilityType.RETAIL_STORE]: 'Retail Store',
};

export const SCOPE_CATEGORY_PRISMA_TO_CLIENT: Record<ScopeCategory, ClientScopeCategory> = {
  [ScopeCategory.SCOPE_1]: 'Scope 1 (Direct)',
  [ScopeCategory.SCOPE_2]: 'Scope 2 (Indirect Energy)',
  [ScopeCategory.SCOPE_3]: 'Scope 3 (Value Chain)',
};

export const RISK_RATING_PRISMA_TO_CLIENT: Record<RiskRating, ClientRiskRating> = {
  [RiskRating.LOW_CARBON]: 'Low Carbon',
  [RiskRating.MODERATE_IMPACT]: 'Moderate Impact',
  [RiskRating.HIGH_EMISSIONS]: 'High Emissions',
  [RiskRating.CRITICAL_FAILURE]: 'Critical Failure',
};

export const DECARB_PRIORITY_PRISMA_TO_CLIENT: Record<
  DecarbonizationPriority,
  ClientDecarbonizationPriority
> = {
  [DecarbonizationPriority.HIGH]: 'High',
  [DecarbonizationPriority.MEDIUM]: 'Medium',
  [DecarbonizationPriority.LOW]: 'Low',
};

// ─── Client Display Strings to Prisma Enums ───────────────────────────────────

export const FACILITY_TYPE_CLIENT_TO_PRISMA: Record<string, FacilityType> = {
  'manufacturing': FacilityType.MANUFACTURING,
  'data center': FacilityType.DATA_CENTER,
  'corporate office': FacilityType.CORPORATE_OFFICE,
  'logistics hub': FacilityType.LOGISTICS_HUB,
  'retail store': FacilityType.RETAIL_STORE,
  'manufacturing_factory': FacilityType.MANUFACTURING,
  // Direct enum keys
  'MANUFACTURING': FacilityType.MANUFACTURING,
  'DATA_CENTER': FacilityType.DATA_CENTER,
  'CORPORATE_OFFICE': FacilityType.CORPORATE_OFFICE,
  'LOGISTICS_HUB': FacilityType.LOGISTICS_HUB,
  'RETAIL_STORE': FacilityType.RETAIL_STORE,
};

export const SCOPE_CATEGORY_CLIENT_TO_PRISMA: Record<string, ScopeCategory> = {
  'scope 1 (direct)': ScopeCategory.SCOPE_1,
  'scope 2 (indirect energy)': ScopeCategory.SCOPE_2,
  'scope 3 (value chain)': ScopeCategory.SCOPE_3,
  'scope 1': ScopeCategory.SCOPE_1,
  'scope 2': ScopeCategory.SCOPE_2,
  'scope 3': ScopeCategory.SCOPE_3,
  // Direct enum keys
  'SCOPE_1': ScopeCategory.SCOPE_1,
  'SCOPE_2': ScopeCategory.SCOPE_2,
  'SCOPE_3': ScopeCategory.SCOPE_3,
};

export const RISK_RATING_CLIENT_TO_PRISMA: Record<string, RiskRating> = {
  'low carbon': RiskRating.LOW_CARBON,
  'moderate impact': RiskRating.MODERATE_IMPACT,
  'high emissions': RiskRating.HIGH_EMISSIONS,
  'critical failure': RiskRating.CRITICAL_FAILURE,
  // Direct enum keys
  'LOW_CARBON': RiskRating.LOW_CARBON,
  'MODERATE_IMPACT': RiskRating.MODERATE_IMPACT,
  'HIGH_EMISSIONS': RiskRating.HIGH_EMISSIONS,
  'CRITICAL_FAILURE': RiskRating.CRITICAL_FAILURE,
};

export const DECARB_PRIORITY_CLIENT_TO_PRISMA: Record<string, DecarbonizationPriority> = {
  'high': DecarbonizationPriority.HIGH,
  'medium': DecarbonizationPriority.MEDIUM,
  'low': DecarbonizationPriority.LOW,
  'HIGH': DecarbonizationPriority.HIGH,
  'MEDIUM': DecarbonizationPriority.MEDIUM,
  'LOW': DecarbonizationPriority.LOW,
};

// ─── Safe Parse Enum Helpers ──────────────────────────────────────────────────

export function safeParseFacilityType(value: unknown): FacilityType {
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase();
    const parsed = FACILITY_TYPE_CLIENT_TO_PRISMA[key] || FACILITY_TYPE_CLIENT_TO_PRISMA[value.trim()];
    if (parsed) return parsed;
  }
  throw new AppError(
    `Invalid facilityType: "${value}". Must be one of: Manufacturing, Data Center, Corporate Office, Logistics Hub, Retail Store.`,
    400
  );
}

export function safeParseScopeCategory(value: unknown): ScopeCategory {
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase();
    const parsed = SCOPE_CATEGORY_CLIENT_TO_PRISMA[key] || SCOPE_CATEGORY_CLIENT_TO_PRISMA[value.trim()];
    if (parsed) return parsed;
  }
  throw new AppError(
    `Invalid scopeCategory: "${value}". Must be one of: Scope 1 (Direct), Scope 2 (Indirect Energy), Scope 3 (Value Chain).`,
    400
  );
}

export function safeParseRiskRating(value: unknown): RiskRating {
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase();
    const parsed = RISK_RATING_CLIENT_TO_PRISMA[key] || RISK_RATING_CLIENT_TO_PRISMA[value.trim()];
    if (parsed) return parsed;
  }
  throw new AppError(
    `Invalid riskRating: "${value}". Must be one of: Low Carbon, Moderate Impact, High Emissions, Critical Failure.`,
    400
  );
}

export function safeParseDecarbonizationPriority(value: unknown): DecarbonizationPriority {
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase();
    const parsed = DECARB_PRIORITY_CLIENT_TO_PRISMA[key] || DECARB_PRIORITY_CLIENT_TO_PRISMA[value.trim()];
    if (parsed) return parsed;
  }
  throw new AppError(
    `Invalid decarbonizationPriority: "${value}". Must be one of: High, Medium, Low.`,
    400
  );
}

// ─── Prisma Result with Relations Type ────────────────────────────────────────

export type EsgAuditWithRelations = Prisma.EsgAuditGetPayload<{
  include: {
    tags: true;
    aiInsight: true;
  };
}>;

export interface MappedAiInsightsResponse {
  decarbonizationPriority: ClientDecarbonizationPriority | string;
  estimatedCostSavingsUsd: number;
  recommendedActions: string[];
}

export interface MappedEsgAuditResponse {
  _id: string;
  id: string;
  title: string;
  facilityName: string;
  facilityType: ClientFacilityType;
  location: string;
  auditYear: number;
  scopeCategory: ClientScopeCategory;
  carbonScoreTons: number;
  energyUsageKwh: number;
  riskRating: ClientRiskRating;
  shortDescription: string;
  fullOverview: string;
  imageUrl?: string | null | undefined;
  tags: string[];
  createdBy: string;
  aiInsights: MappedAiInsightsResponse;
  createdAt: string;
  updatedAt: string;
}

// ─── Mapping Function ─────────────────────────────────────────────────────────

export function mapPrismaAuditToClient(audit: EsgAuditWithRelations): MappedEsgAuditResponse {
  const facilityType = FACILITY_TYPE_PRISMA_TO_CLIENT[audit.facilityType] || 'Corporate Office';
  const scopeCategory = SCOPE_CATEGORY_PRISMA_TO_CLIENT[audit.scopeCategory] || 'Scope 1 (Direct)';
  const riskRating = RISK_RATING_PRISMA_TO_CLIENT[audit.riskRating] || 'Moderate Impact';

  const aiInsights: MappedAiInsightsResponse = audit.aiInsight
    ? {
        decarbonizationPriority:
          DECARB_PRIORITY_PRISMA_TO_CLIENT[audit.aiInsight.decarbonizationPriority] || 'Medium',
        estimatedCostSavingsUsd: Number(audit.aiInsight.estimatedCostSavingsUsd),
        recommendedActions: audit.aiInsight.recommendedActions || [],
      }
    : {
        decarbonizationPriority: 'Medium',
        estimatedCostSavingsUsd: 0,
        recommendedActions: [],
      };

  const tags = Array.isArray(audit.tags) ? audit.tags.map((t) => t.name) : [];

  return {
    _id: audit.id,
    id: audit.id,
    title: audit.title,
    facilityName: audit.facilityName,
    facilityType,
    location: audit.location,
    auditYear: audit.auditYear,
    scopeCategory,
    carbonScoreTons: Number(audit.carbonScoreTons),
    energyUsageKwh: Number(audit.energyUsageKwh),
    riskRating,
    shortDescription: audit.shortDescription,
    fullOverview: audit.fullOverview,
    imageUrl: audit.imageUrl ?? null,
    tags,
    createdBy: audit.createdBy,
    aiInsights,
    createdAt: audit.createdAt instanceof Date ? audit.createdAt.toISOString() : String(audit.createdAt),
    updatedAt: audit.updatedAt instanceof Date ? audit.updatedAt.toISOString() : String(audit.updatedAt),
  };
}
