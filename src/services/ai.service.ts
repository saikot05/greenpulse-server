import { GoogleGenAI } from '@google/genai';
import { Types } from 'mongoose';
import { AppError } from '../utils/AppError.js';
import {
  conversationRepository,
  esgAuditRepository,
  carbonAnalysisRepository,
} from '../repositories/index.js';
import type { IMessage } from '../models/Conversation.model.js';
import type { ICarbonAnalysis } from '../models/CarbonAnalysis.model.js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import axios from 'axios';


const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});
import { generateObject } from 'ai';
import { z } from 'zod';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

// Zod Schema defined as requested by the user
export const UtilityBillSchema = z.object({
  facilityName: z.string().describe('The name of the consumer, company, or building on the bill. Fallback to a safe default if not found.'),
  facilityType: z.enum(['Manufacturing', 'Data Center', 'Corporate Office', 'Logistics Hub', 'Retail Store']).describe('Type of facility.'),
  energyUsageKwh: z.number().describe('Total units or energy consumed in kWh. If not present or unable to calculate, use 0.'),
  estimatedCarbonTons: z.number().describe('Estimated carbon footprint in metric tons of CO2 equivalent. If not present, use 0.'),
  scopeCategory: z.enum(['Scope 1 (Direct)', 'Scope 2 (Indirect Energy)', 'Scope 3 (Value Chain)']).describe('Scope category. Fallback to Scope 2 (Indirect Energy) for utility electricity/gas.'),
  riskRating: z.enum(['Low Carbon', 'Moderate Impact', 'High Emissions', 'Critical Failure']).describe('Carbon intensity risk rating.'),
  shortDescription: z.string().describe('Descriptive audit title or short summary (min 10 characters).'),
  fullOverview: z.string().describe('Detailed overview of the audit (min 20 characters).'),
});

// Mapped types for strict response checks
export interface IParsedBill {
  facilityName: string;
  facilityType: 'Manufacturing' | 'Data Center' | 'Corporate Office' | 'Logistics Hub' | 'Retail Store';
  energyUsageKwh: number;
  estimatedCarbonTons: number;
  scopeCategory: 'Scope 1 (Direct)' | 'Scope 2 (Indirect Energy)' | 'Scope 3 (Value Chain)';
  riskRating: 'Low Carbon' | 'Moderate Impact' | 'High Emissions' | 'Critical Failure';
  shortDescription: string;
  fullOverview: string;
}

export interface IAiInsightsOutput {
  decarbonizationPriority: 'High' | 'Medium' | 'Low';
  estimatedCostSavingsUsd: number;
  recommendedActions: string[];
}

export class AiService {
  /**
   * Generic helper method to call Gemini API with retry and exponential backoff.
   */
  private async callGeminiWithRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs = 3500
  ): Promise<T> {
    let currentDelay = delayMs;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const isRateLimit =
          error.status === 429 ||
          error.statusCode === 429 ||
          (error.message &&
            (error.message.includes('429') ||
              error.message.includes('RESOURCE_EXHAUSTED') ||
              error.message.toLowerCase().includes('quota') ||
              error.message.toLowerCase().includes('limit')));

        if (isRateLimit && attempt < retries) {
          console.warn(
            `[Gemini API] Rate limit reached. Retrying in ${
              currentDelay / 1000
            } seconds... (Attempt ${attempt} of ${retries})`
          );
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
          currentDelay *= 2; // Exponential backoff
        } else {
          throw error;
        }
      }
    }
    throw new Error('Gemini API call failed after max retries.');
  }

  private async generateContentWithRetry(
    contents: any,
    configOptions: any
  ): Promise<any> {
    try {
      return await this.callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents,
          config: configOptions,
        })
      );
    } catch (primaryError: any) {
      console.warn(
        `[Gemini Fallback]: Primary model gemini-2.0-flash failed after retries. Reason: ${
          primaryError.message || primaryError
        }. Trying fallback gemini-1.5-flash...`
      );
      return await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents,
        config: configOptions,
      });
    }
  }

  /**
   * Parse utility bill PDF or image using Groq API (llama3-70b-8192 for PDFs, llama-3.2-11b-vision-preview for images)
   */
  public async parseUtilityBill(fileBuffer: Buffer, mimeType: string): Promise<any> {
    try {
      const isPdf = mimeType === 'application/pdf';

      const prompt = `You are an expert ESG sustainability analyst. Analyze this utility bill or invoice and extract all sustainability and energy data.
      
If certain values are missing or cannot be visibly found, calculate or use these safe defaults to prevent validation errors:
- For facilityName: Fallback to a safe default like "Unknown Facility".
- For facilityType: Choose one of exactly: 'Manufacturing', 'Data Center', 'Corporate Office', 'Logistics Hub', or 'Retail Store'.
- For energyUsageKwh: Use 0.
- For estimatedCarbonTons: Use 0.
- For scopeCategory: Fallback to "Scope 2 (Indirect Energy)" for grid electricity/gas.
- For riskRating: Fallback to "Low Carbon".
- For shortDescription: A brief 1-sentence summary (min 10 characters).
- For fullOverview: A detailed audit summary paragraph (min 20 characters).`;

      const result = await generateObject({
        model: google('gemini-2.0-flash'),
        schema: UtilityBillSchema,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'file',
                data: fileBuffer,
                mediaType: mimeType,
              },
            ],
          },
        ],
      });

      return result.object;
    } catch (error: any) {
      console.error('[Gemini OCR Error]:', error);

      // Handle Vercel AI SDK TypeValidationError
      if (error.name === 'TypeValidationError' || error.validationErrors) {
        const issues = error.validationErrors || [];
        throw new AppError(
          `AI parsing schema validation failed: ${issues.map((e: any) => `'${e.path.join('.')}': ${e.message}`).join('; ')}`,
          502
        );
      }
      
      if (error instanceof z.ZodError) {
        throw new AppError(
          `AI parsing schema validation failed: ${error.issues.map((e: z.ZodIssue) => `'${e.path.join('.')}': ${e.message}`).join('; ')}`,
          502
        );
      }
      
      const isRateLimit =
        error.statusCode === 429 ||
        error.status === 429 ||
        (error.message &&
          (error.message.includes('429') ||
            error.message.includes('RESOURCE_EXHAUSTED') ||
            error.message.toLowerCase().includes('quota') ||
            error.message.toLowerCase().includes('limit')));

      if (isRateLimit) {
        throw new AppError(
          'Gemini free tier quota is temporarily full. Please wait 10 seconds and try uploading again, or fill the audit form manually.',
          429
        );
      }
      
      const status = error.statusCode || error.status || 500;
      throw new AppError(
        `Utility bill parsing failed: ${error.message || error}`,
        status
      );
    }
  }

  /**
   * Generates 3 to 5 realistic ESG tags for an audit using Gemini.
   */
  public async generateAuditTags(auditData: Partial<IParsedBill> & { title: string }): Promise<string[]> {
    try {
      const prompt = `Based on this ESG audit details, generate 3 to 5 highly relevant, realistic ESG tags starting with # (e.g. #GridDependence, #Scope2Spike, #RE100Candidate, #LowCarbonTransition).
Audit Data:
- Title: ${auditData.title}
- Facility: ${auditData.facilityName} (${auditData.facilityType})
- Scope: ${auditData.scopeCategory}
- Risk Rating: ${auditData.riskRating}
- Carbon Score: ${auditData.estimatedCarbonTons} tons
- Energy Usage: ${auditData.energyUsageKwh} kWh

Respond strictly in JSON format.`;

      const response = await this.generateContentWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            tags: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['tags'],
        },
      });

      const responseText = response.text;
      if (!responseText) return ['#UtilityBill', '#ESGAudit'];

      const parsed = JSON.parse(responseText) as { tags: string[] };
      return parsed.tags;
    } catch (error) {
      console.warn('[Gemini Auto-Tag Warning]:', error);
      // Graceful fallback tags
      const safeFacility = auditData.facilityType ?? 'Facility';
      return ['#UtilityBill', '#ESGAudit', `#${safeFacility.replace(/\s+/g, '')}`];
    }
  }

  /**
   * Generates actionable AI insights (Decarbonization Priority, Cost Savings, and Actions)
   * to satisfy the EsgAudit schema validation requirement.
   */
  public async generateAiInsights(
    auditData: Partial<IParsedBill> & { title: string }
  ): Promise<IAiInsightsOutput> {
    try {
      const prompt = `Generate decarbonization priority, estimated cost savings in USD, and 3 recommended actions for this facility audit:
- Title: ${auditData.title}
- Facility Type: ${auditData.facilityType}
- Energy Usage: ${auditData.energyUsageKwh} kWh
- Carbon Score: ${auditData.estimatedCarbonTons} tons
- Risk: ${auditData.riskRating}

Respond strictly in JSON.`;

      const response = await this.generateContentWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            decarbonizationPriority: {
              type: 'STRING',
              enum: ['High', 'Medium', 'Low'],
            },
            estimatedCostSavingsUsd: { type: 'NUMBER' },
            recommendedActions: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['decarbonizationPriority', 'estimatedCostSavingsUsd', 'recommendedActions'],
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty insights response');
      }

      return JSON.parse(responseText) as IAiInsightsOutput;
    } catch (error) {
      console.warn('[Gemini Insights Warning]:', error);
      // Fallback insights
      return {
        decarbonizationPriority: auditData.estimatedCarbonTons && auditData.estimatedCarbonTons > 500 ? 'High' : 'Medium',
        estimatedCostSavingsUsd: Math.round((auditData.energyUsageKwh ?? 1000) * 0.12),
        recommendedActions: [
          'Conduct comprehensive building envelope thermal analysis.',
          'Optimize HVAC scheduling and operational setpoints.',
          'Assess transition viability to on-site solar photovoltaic installation.',
        ],
      };
    }
  }

  /**
   * Generates a context-aware chat response for the sustainability assistant,
   * keeping MongoDB history.
   */
  public async generateChatResponse(
    userId: string,
    sessionId: string,
    message: string
  ): Promise<string> {
    try {
      // 1. Fetch user's audits for context
      const userAudits = await esgAuditRepository.find({
        createdBy: new Types.ObjectId(userId),
      });

      const auditsCtx = userAudits.map((a) => ({
        title: a.title,
        facilityName: a.facilityName,
        facilityType: a.facilityType,
        location: a.location,
        auditYear: a.auditYear,
        scopeCategory: a.scopeCategory,
        carbonScoreTons: a.carbonScoreTons,
        energyUsageKwh: a.energyUsageKwh,
        riskRating: a.riskRating,
        shortDescription: a.shortDescription,
        aiInsights: a.aiInsights,
      }));

      const systemInstruction = `You are GreenPulse Net-Zero AI, a context-aware sustainability copilot.
Your goal is to answer questions about corporate ESG audits, energy consumption, and carbon footprint reduction strategies.
You have access to the user's active facility audits:
${JSON.stringify(auditsCtx, null, 2)}

Provide clear, professional, net-zero compliance advice. Highlight specific facility names and values where relevant. If the user asks about a facility or audit not in the context, guide them on how to add it. Keep your replies concise and well-formatted in markdown.`;

      // 2. Fetch conversation history
      const conv = await conversationRepository.findOne({
        sessionId,
        userId: new Types.ObjectId(userId),
      });

      const contents: any[] = [];
      if (conv && conv.messages) {
        for (const msg of conv.messages) {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          });
        }
      }

      // Add the latest message
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      // 3. Call Gemini
      const response = await this.generateContentWithRetry(contents, {
        systemInstruction,
      });

      const responseText = response.text || 'I could not generate a response. Please try again.';

      // 4. Save history
      const userMsg: IMessage = {
        sender: 'user',
        content: message,
        createdAt: new Date(),
      };

      const assistantMsg: IMessage = {
        sender: 'assistant',
        content: responseText,
        createdAt: new Date(),
      };

      await conversationRepository.appendMessage(sessionId, userId, userMsg);
      await conversationRepository.appendMessage(sessionId, userId, assistantMsg);

      return responseText;
    } catch (error) {
      console.error('[Gemini Chat Error]:', error);
      throw new AppError(
        'Gemini assistant is temporarily unavailable. Reason: ' + (error as Error).message,
        502
      );
    }
  }

  /**
   * Analyzes raw energy telemetry CSV/JSON data, runs Gemini analysis, and saves the results in DB.
   */
  public async analyzeCarbonTelemetry(
    fileBuffer: Buffer,
    fileName: string,
    userId: string
  ): Promise<ICarbonAnalysis> {
    try {
      const fileType = fileName.toLowerCase().endsWith('.csv') ? 'CSV' : 'JSON';
      let telemetryData: any[] = [];
      let totalKwh = 0;
      let peakUsage = 0;

      const text = fileBuffer.toString('utf-8');
      if (fileType === 'JSON') {
        const parsed = JSON.parse(text);
        telemetryData = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Parse CSV lines simply
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        // Skip header
        const rows = lines.slice(1);
        telemetryData = rows.map((r) => {
          const cols = r.split(',');
          return {
            timestamp: cols[0] || new Date().toISOString(),
            energyKwh: parseFloat(cols[1] || '0'),
            scope: cols[2] || 'Scope 2 (Indirect Energy)',
          };
        });
      }

      const recordCount = telemetryData.length;
      for (const row of telemetryData) {
        const kwh = parseFloat(row.energyKwh || row.kwh || 0);
        totalKwh += kwh;
        if (kwh > peakUsage) {
          peakUsage = kwh;
        }
      }

      const prompt = `Analyze this facility energy telemetry data.
Calculate carbon footprint splits across Scope 1 (Direct fuel), Scope 2 (Grid electricity), and Scope 3 (Supply chain transport).
Identify anomalies (e.g., sudden load spikes, baseline weekend leaks, or high heat values).
Write a professional Net-Zero executive summary.

Total Records: ${recordCount}
Total Consumption: ${totalKwh} kWh
Peak Demand: ${peakUsage} kW

Sample Telemetry:
${JSON.stringify(telemetryData.slice(0, 50), null, 2)}

Respond strictly in JSON matching the specified schema.`;

      const response = await this.generateContentWithRetry(prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            scopeSplits: {
              type: 'OBJECT',
              properties: {
                scope1: { type: 'NUMBER' },
                scope2: { type: 'NUMBER' },
                scope3: { type: 'NUMBER' },
              },
              required: ['scope1', 'scope2', 'scope3'],
            },
            detectedAnomalies: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            executiveSummary: { type: 'STRING' },
          },
          required: ['scopeSplits', 'detectedAnomalies', 'executiveSummary'],
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini failed to return carbon analysis insights.');
      }

      const aiEvaluation = JSON.parse(responseText);

      const newAnalysis = await carbonAnalysisRepository.create({
        uploadedBy: new Types.ObjectId(userId),
        fileName,
        fileType,
        rawSummary: {
          totalRecords: recordCount,
          totalKwh: Math.round(totalKwh),
          peakUsage: Math.round(peakUsage),
        },
        aiEvaluation,
        status: 'completed',
      });

      return newAnalysis;
    } catch (error) {
      console.error('[Gemini Carbon Analysis Error]:', error);
      throw new AppError(
        'Carbon telemetry analysis failed. Reason: ' + (error as Error).message,
        502
      );
    }
  }
}

export const aiService = new AiService();
