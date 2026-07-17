import { Schema, model, Types } from 'mongoose';
import type { Document } from 'mongoose';

export type FacilityType = 'Manufacturing' | 'Data Center' | 'Corporate Office' | 'Logistics Hub' | 'Retail Store';
export type ScopeCategory = 'Scope 1 (Direct)' | 'Scope 2 (Indirect Energy)' | 'Scope 3 (Value Chain)';
export type RiskRating = 'Low Carbon' | 'Moderate Impact' | 'High Emissions' | 'Critical Failure';

export interface IAiInsights {
  decarbonizationPriority: 'High' | 'Medium' | 'Low' | string;
  estimatedCostSavingsUsd: number;
  recommendedActions: string[];
}

export interface IEsgAudit extends Document {
  title: string;
  facilityName: string;
  facilityType: FacilityType;
  location: string;
  auditYear: number;
  scopeCategory: ScopeCategory;
  carbonScoreTons: number;
  energyUsageKwh: number;
  riskRating: RiskRating;
  shortDescription: string;
  fullOverview: string;
  imageUrl?: string;
  tags: string[];
  createdBy: Types.ObjectId;
  aiInsights: IAiInsights;
  createdAt: Date;
  updatedAt: Date;
}

const AiInsightsSchema = new Schema<IAiInsights>(
  {
    decarbonizationPriority: {
      type: String,
      required: [true, 'AI Decarbonization priority is required.'],
      trim: true,
    },
    estimatedCostSavingsUsd: {
      type: Number,
      required: [true, 'AI Estimated cost savings are required.'],
      min: [0, 'Cost savings cannot be negative.'],
    },
    recommendedActions: {
      type: [String],
      required: [true, 'AI Recommended actions array is required.'],
    },
  },
  { _id: false }
);

const EsgAuditSchema = new Schema<IEsgAudit>(
  {
    title: {
      type: String,
      required: [true, 'Audit title is required.'],
      index: true,
      trim: true,
    },
    facilityName: {
      type: String,
      required: [true, 'Facility name is required.'],
      trim: true,
    },
    facilityType: {
      type: String,
      enum: ['Manufacturing', 'Data Center', 'Corporate Office', 'Logistics Hub', 'Retail Store'],
      required: [true, 'Facility type is required.'],
    },
    location: {
      type: String,
      required: [true, 'Location is required.'],
      index: true,
      trim: true,
    },
    auditYear: {
      type: Number,
      required: [true, 'Audit year is required.'],
      index: true,
    },
    scopeCategory: {
      type: String,
      enum: ['Scope 1 (Direct)', 'Scope 2 (Indirect Energy)', 'Scope 3 (Value Chain)'],
      required: [true, 'Scope category is required.'],
    },
    carbonScoreTons: {
      type: Number,
      required: [true, 'Carbon score is required.'],
      min: [0, 'Carbon score tons cannot be negative.'],
    },
    energyUsageKwh: {
      type: Number,
      required: [true, 'Energy usage is required.'],
      min: [0, 'Energy usage Kwh cannot be negative.'],
    },
    riskRating: {
      type: String,
      enum: ['Low Carbon', 'Moderate Impact', 'High Emissions', 'Critical Failure'],
      required: [true, 'Risk rating is required.'],
      index: true,
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required.'],
      trim: true,
    },
    fullOverview: {
      type: String,
      required: [true, 'Full overview is required.'],
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      required: [true, 'Tags are required.'],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user ref is required.'],
      index: true,
    },
    aiInsights: {
      type: AiInsightsSchema,
      required: [true, 'AI Insights nested block is required.'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on facilityType, riskRating, and auditYear descending
EsgAuditSchema.index({ facilityType: 1, riskRating: 1, auditYear: -1 });

export const EsgAudit = model<IEsgAudit>('EsgAudit', EsgAuditSchema);
export default EsgAudit;
