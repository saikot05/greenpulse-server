import type { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { aiService, aiChatService } from '../services/index.js';
import { AppError } from '../utils/AppError.js';
import { conversationRepository } from '../repositories/index.js';
import type { AuthenticatedRequest } from '../interfaces/auth.interface.js';
import { generateObject, generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { z } from 'zod';
import multer from 'multer';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY || '',
});

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const IParsedBillResponseSchema = z.object({
  facilityName: z.string().describe('The name of the consumer, company, or building on the bill'),
  facilityType: z.enum(['Manufacturing', 'Data Center', 'Corporate Office', 'Logistics Hub', 'Retail Store']),
  energyUsageKwh: z.number().describe('Total energy consumed in kWh'),
  estimatedCarbonTons: z.number().describe('Estimated CO2 equivalent in metric tons'),
  scopeCategory: z.enum(['Scope 1 (Direct)', 'Scope 2 (Indirect Energy)', 'Scope 3 (Value Chain)']),
  riskRating: z.enum(['Low Carbon', 'Moderate Impact', 'High Emissions', 'Critical Failure']),
  shortDescription: z.string().describe('A descriptive short summary of the audit findings (min 10 characters)'),
  fullOverview: z.string().describe('A detailed overview of the audit (min 20 characters)'),
});


export class AiController {
  /**
   * Endpoint: POST /api/v1/ai/parse-bill
   * Parses uploaded utility bill file (image/PDF) using Gemini.
   */
  public parseBill = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        return next(new AppError('No utility bill file was uploaded.', 400));
      }

      const prompt = `You are an expert ESG sustainability analyst. Analyze this utility bill or invoice and extract all sustainability and energy data.
    
If certain values are missing or cannot be visibly found, use these safe defaults to prevent validation errors:
- For facilityName, use "Unknown Facility".
- For facilityType, choose one of exactly: 'Manufacturing', 'Data Center', 'Corporate Office', 'Logistics Hub', or 'Retail Store'. Default to 'Corporate Office' if not clear.
- For energyUsageKwh, use 0.
- For estimatedCarbonTons, use 0.
- For scopeCategory, use "Scope 2 (Indirect Energy)" for grid electricity/gas.
- For riskRating, use "Low Carbon".
- For shortDescription, use a brief 1-sentence summary (min 10 characters).
- For fullOverview, use a detailed audit summary paragraph (min 20 characters).`;

      let result;
      try {
        console.log('[AI Controller]: Attempting utility bill parsing with Google Gemini (Primary)...');
        result = await generateObject({
          model: google('gemini-2.0-flash'),
          schema: IParsedBillResponseSchema,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'file',
                  data: file.buffer,
                  mediaType: file.mimetype,
                },
              ],
            },
          ],
        });
      } catch (geminiError: any) {
        console.log('[AI Agent]: Primary Gemini engine exhausted. Initiating self-healing routing via Mistral AI...');
        console.warn('[AI Agent Gemini Error Debug]:', geminiError.message || geminiError);

        result = await generateObject({
          model: mistral('pixtral-12b-2409'),
          schema: IParsedBillResponseSchema,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'file',
                  data: file.buffer,
                  mediaType: file.mimetype,
                },
              ],
            },
          ],
        });
      }

      res.status(200).json({
        status: 'success',
        data: result.object,
      });
    } catch (error: any) {
      // Check if it's a rate limit error (Vercel AI SDK wraps standard API errors)
      const isRateLimit = 
        error.statusCode === 429 || 
        error.status === 429 || 
        (error.message && (
          error.message.includes('429') || 
          error.message.includes('RESOURCE_EXHAUSTED') || 
          error.message.toLowerCase().includes('quota') || 
          error.message.toLowerCase().includes('limit')
        ));

      if (isRateLimit) {
        res.status(429).json({
          success: false,
          message: 'Selected AI provider quota is full. Please try again in a few seconds or switch providers.'
        });
        return;
      }

      // Handle Vercel AI SDK TypeValidationError
      if (error.name === 'TypeValidationError' || error.validationErrors) {
        const issues = error.validationErrors || [];
        return next(new AppError(
          `AI parsing schema validation failed: ${issues.map((e: any) => `'${e.path.join('.')}': ${e.message}`).join('; ')}`,
          502
        ));
      }

      next(error);
    }
  };

  /**
   * Endpoint: POST /api/v1/ai/chat
   * Protected. Streams AI chat response with tool-calling from Gemini.
   */
  public chatWithAgent = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        return next(new AppError('Unauthorized: Authentication required.', 401));
      }

      const { messages, sessionId, stream } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return next(new AppError('Messages array is required.', 400));
      }

      const isStreaming = stream !== false;

      if (!isStreaming) {
        const systemPrompt = `You are a Senior Sustainability & Decarbonization Consultant for GreenPulse AI.
Your job is to answer questions regarding carbon footprints, energy mitigation, and audit strategies.
Be professional, structured, and prioritize carbon reductions.`;

        let textResult = '';
        try {
          console.log('[AI Controller]: Generating non-stream chat response with Google Gemini (Primary)...');
          const response = await generateText({
            model: google('gemini-2.0-flash'),
            system: systemPrompt,
            messages: messages.map((m: any) => ({
              role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
              content: m.content || m.text || '',
            })),
          });
          textResult = response.text;
        } catch (geminiError: any) {
          console.warn('[AI Controller]: Gemini chat failed. Falling back to Mistral AI...', geminiError.message || geminiError);
          const response = await generateText({
            model: mistral('pixtral-12b-2409'),
            system: systemPrompt,
            messages: messages.map((m: any) => ({
              role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
              content: m.content || m.text || '',
            })),
          });
          textResult = response.text;
        }

        res.status(200).json({
          status: 'success',
          data: {
            text: textResult,
          },
        });
        return;
      }

      if (!sessionId) {
        return next(new AppError('Session ID is required for streaming mode.', 400));
      }

      const result = await aiChatService.streamChatResponse(
        messages,
        String(user._id),
        sessionId
      );

      const streamResponse = result.toDataStreamResponse();
      res.status(streamResponse.status);
      streamResponse.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });

      const reader = streamResponse.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Endpoint: POST /api/v1/ai/analyze-data
   * Analyzes uploaded energy load telemetry CSV/JSON and stores results.
   */
  public analyzeTelemetryData = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        return next(new AppError('Unauthorized: Authentication required.', 401));
      }

      const file = req.file;
      if (!file) {
        return next(new AppError('No telemetry data file was uploaded.', 400));
      }

      const analysis = await aiService.analyzeCarbonTelemetry(
        file.buffer,
        file.originalname,
        String(user._id)
      );

      res.status(200).json({
        status: 'success',
        data: analysis,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Endpoint: GET /api/v1/ai/chat/history
   * Protected. Retrieves conversation history by sessionId for a specific user.
   */
  public getChatHistory = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        return next(new AppError('Unauthorized: Authentication required.', 401));
      }

      const { sessionId } = req.query as { sessionId: string };
      if (!sessionId) {
        return next(new AppError('Session ID is required.', 400));
      }

      const conversation = await conversationRepository.findOne({
        sessionId,
        userId: new Types.ObjectId(String(user._id)),
      });

      res.status(200).json({
        status: 'success',
        data: conversation || { messages: [] },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Endpoint: POST /api/v1/ai/analyze-telemetry
   * Protected. Uploads CSV or JSON telemetry data to return structured AI insights.
   */
  public analyzeTelemetry = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        return next(new AppError('Unauthorized: Authentication required.', 401));
      }

      const file = req.file;
      if (!file) {
        return next(new AppError('No telemetry file was uploaded.', 400));
      }

      const rawDataText = file.buffer.toString('utf-8');

      const TelemetryAnalysisSchema = z.object({
        summary: z.string().describe('Overall trend analysis of the telemetry data'),
        anomalies: z.array(z.string()).describe('List of spikes or unusual patterns'),
        kpiMetrics: z.object({
          totalEmissions: z.number().describe('Total carbon emissions calculated in metric tons CO2e'),
          peakUsageTime: z.string().describe('Time period showing peak consumption'),
          efficiencyScore: z.number().describe('Calculated energy efficiency score from 0 to 100')
        }),
        chartData: z.array(
          z.object({
            label: z.string().describe('Label indicator, e.g. "Hour 1", "Day 1"'),
            emissions: z.number().describe('Estimated carbon emissions in metric tons'),
            consumption: z.number().describe('Estimated consumption in kWh')
          })
        ).describe('Breakdown of logs for Recharts charting')
      });

      const systemPrompt = `You are a Senior Sustainability & Carbon Telemetry Analyst for GreenPulse AI.
Analyze the following raw energy or utility logs (CSV/JSON format) and return structured compliance analysis.
Calculate Scope 1/2/3 carbon footprint emissions based on the consumption logs.`;

      let result;
      try {
        console.log('[AI Controller]: Analyzing telemetry with Google Gemini (Primary)...');
        result = await generateObject({
          model: google('gemini-2.0-flash'),
          schema: TelemetryAnalysisSchema,
          system: systemPrompt,
          prompt: rawDataText.slice(0, 10000), // Slice to prevent exceeding model input limits
        });
      } catch (geminiError: any) {
        console.warn('[AI Controller]: Gemini telemetry analysis failed. Initiating self-healing routing via Mistral AI...', geminiError.message || geminiError);
        result = await generateObject({
          model: mistral('pixtral-12b-2409'),
          schema: TelemetryAnalysisSchema,
          system: systemPrompt,
          prompt: rawDataText.slice(0, 10000),
        });
      }

      res.status(200).json({
        status: 'success',
        data: result.object,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const aiController = new AiController();
