import { GoogleGenAI } from '@google/genai';
import { AppError } from '../utils/AppError.js';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

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
   * Parse utility bill PDF or image using Gemini 2.5 Flash Vision.
   */
  public async parseUtilityBill(fileBuffer: Buffer, mimeType: string): Promise<IParsedBill> {
    try {
      const base64Data = fileBuffer.toString('base64');
      const prompt = `Analyze this utility bill invoice and extract the sustainability data.
If any value is missing, estimate it realistically based on the facility type and usage numbers found.
Respond strictly in JSON matching the specified schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              facilityName: { type: 'STRING' },
              facilityType: {
                type: 'STRING',
                enum: ['Manufacturing', 'Data Center', 'Corporate Office', 'Logistics Hub', 'Retail Store'],
              },
              energyUsageKwh: { type: 'NUMBER' },
              estimatedCarbonTons: { type: 'NUMBER' },
              scopeCategory: {
                type: 'STRING',
                enum: ['Scope 1 (Direct)', 'Scope 2 (Indirect Energy)', 'Scope 3 (Value Chain)'],
              },
              riskRating: {
                type: 'STRING',
                enum: ['Low Carbon', 'Moderate Impact', 'High Emissions', 'Critical Failure'],
              },
              shortDescription: { type: 'STRING' },
              fullOverview: { type: 'STRING' },
            },
            required: [
              'facilityName',
              'facilityType',
              'energyUsageKwh',
              'estimatedCarbonTons',
              'scopeCategory',
              'riskRating',
              'shortDescription',
              'fullOverview',
            ],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new AppError('Gemini did not return any parseable content.', 500);
      }

      return JSON.parse(responseText) as IParsedBill;
    } catch (error) {
      console.error('[Gemini OCR Error]:', error);
      throw new AppError(
        `Failed to parse utility bill. Gemini error: ${(error as Error).message}`,
        502
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

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
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

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
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
}

export const aiService = new AiService();
