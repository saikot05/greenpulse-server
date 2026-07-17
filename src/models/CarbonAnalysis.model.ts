import { Schema, model, Types } from 'mongoose';
import type { Document } from 'mongoose';

export type FileType = 'CSV' | 'JSON';
export type CarbonAnalysisStatus = 'processing' | 'completed' | 'failed';

export interface IRawSummary {
  totalRecords: number;
  totalKwh: number;
  peakUsage: number;
}

export interface IScopeSplits {
  scope1: number;
  scope2: number;
  scope3: number;
}

export interface IAiEvaluation {
  scopeSplits: IScopeSplits;
  detectedAnomalies: string[];
  executiveSummary: string;
}

export interface ICarbonAnalysis extends Document {
  auditId?: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  fileName: string;
  fileType: FileType;
  rawSummary: IRawSummary;
  aiEvaluation: IAiEvaluation;
  status: CarbonAnalysisStatus;
  createdAt: Date;
  updatedAt: Date;
}

const RawSummarySchema = new Schema<IRawSummary>(
  {
    totalRecords: {
      type: Number,
      required: [true, 'Total records count is required.'],
      min: [0, 'Total records count cannot be negative.'],
    },
    totalKwh: {
      type: Number,
      required: [true, 'Total energy (Kwh) usage is required.'],
      min: [0, 'Total energy (Kwh) usage cannot be negative.'],
    },
    peakUsage: {
      type: Number,
      required: [true, 'Peak usage is required.'],
      min: [0, 'Peak usage cannot be negative.'],
    },
  },
  { _id: false }
);

const ScopeSplitsSchema = new Schema<IScopeSplits>(
  {
    scope1: {
      type: Number,
      required: [true, 'Scope 1 split value is required.'],
      min: [0, 'Scope 1 split value cannot be negative.'],
    },
    scope2: {
      type: Number,
      required: [true, 'Scope 2 split value is required.'],
      min: [0, 'Scope 2 split value cannot be negative.'],
    },
    scope3: {
      type: Number,
      required: [true, 'Scope 3 split value is required.'],
      min: [0, 'Scope 3 split value cannot be negative.'],
    },
  },
  { _id: false }
);

const AiEvaluationSchema = new Schema<IAiEvaluation>(
  {
    scopeSplits: {
      type: ScopeSplitsSchema,
      required: [true, 'Scope splits breakdown is required.'],
    },
    detectedAnomalies: {
      type: [String],
      required: [true, 'Detected anomalies list is required.'],
    },
    executiveSummary: {
      type: String,
      required: [true, 'AI Executive summary text is required.'],
      trim: true,
    },
  },
  { _id: false }
);

const CarbonAnalysisSchema = new Schema<ICarbonAnalysis>(
  {
    auditId: {
      type: Schema.Types.ObjectId,
      ref: 'EsgAudit',
      required: false,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploaded by user reference is required.'],
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required.'],
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['CSV', 'JSON'],
      required: [true, 'File type must be CSV or JSON.'],
    },
    rawSummary: {
      type: RawSummarySchema,
      required: [true, 'Raw summary stats are required.'],
    },
    aiEvaluation: {
      type: AiEvaluationSchema,
      required: [true, 'AI evaluation insights are required.'],
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      required: [true, 'Analysis status is required.'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CarbonAnalysis = model<ICarbonAnalysis>('CarbonAnalysis', CarbonAnalysisSchema);
export default CarbonAnalysis;
