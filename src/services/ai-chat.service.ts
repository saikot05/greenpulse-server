import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { Types } from 'mongoose';
import { esgAuditRepository, conversationRepository } from '../repositories/index.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Custom Schema factory to bypass Zod type conflicts between package versions.
 */
function createCustomSchema<T>(
  jsonSchema: any,
  validateFn: (val: any) => { success: boolean; data?: T; error?: any }
): any {
  return {
    _type: undefined as any,
    jsonSchema,
    validate: (value: unknown) => {
      const result = validateFn(value);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: new Error(String(result.error)) };
      }
    }
  };
}

export class AiChatService {
  /**
   * Streams chat response using Vercel AI SDK streamText and Gemini 2.5 Flash.
   * Exposes agentic tools for DB query and carbon strategy calculation.
   * Persists message history to MongoDB on completion.
   */
  public async streamChatResponse(
    messages: ChatMessage[],
    userId: string,
    sessionId: string
  ): Promise<any> {
    try {
      // 1. Query current user's audits to build static context for the prompt
      const userAudits = await esgAuditRepository.find({
        createdBy: new Types.ObjectId(String(userId))
      });

      const auditSummaryList = userAudits.map((a: any) => 
        `- Facility: ${a.facilityName} (${a.facilityType}) | Location: ${a.location} | Year: ${a.auditYear} | Carbon Score: ${a.carbonScoreTons} tons | Energy Usage: ${a.energyUsageKwh} kWh | Risk: ${a.riskRating}`
      ).join('\n');

      const systemPrompt = `You are the GreenPulse AI Sustainability Copilot, a helpful compliance expert.
Your job is to answer sustainability and energy audits questions.
You have access to the user's active facility compliance logs below. Use them to answer questions factually:

USER AUDITS CONTEXT:
${auditSummaryList || 'No facility compliance records logged yet under this account.'}

If they ask to analyze their total metrics, use the getAuditMetrics tool.
If they need decarbonization planning, use the suggestDecarbonizationStrategy tool.
Be professional, structured, and prioritize carbon reductions.`;

      // 2. Map messages to Vercel AI SDK CoreMessage format
      const formattedMessages = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));

      // 3. Invoke streamText
      const result = streamText({
        model: google('gemini-2.0-flash'),
        messages: formattedMessages,
        system: systemPrompt,
        onFinish: async ({ text }) => {
          try {
            const lastUserMessage = messages[messages.length - 1];
            if (!lastUserMessage) return;

            const userMsg = {
              sender: 'user' as const,
              content: lastUserMessage.content,
              createdAt: new Date(),
            };
            const assistantMsg = {
              sender: 'assistant' as const,
              content: text,
              createdAt: new Date(),
            };

            const conv = await conversationRepository.findOne({
              sessionId,
              userId: new Types.ObjectId(String(userId)),
            });

            if (conv) {
              // Deduplicate user message if already present
              const userMsgExists = conv.messages.some(
                (m) => m.content === userMsg.content && m.sender === 'user'
              );
              if (!userMsgExists) {
                conv.messages.push(userMsg);
              }
              conv.messages.push(assistantMsg);
              await conversationRepository.updateById(String(conv._id), conv);
            } else {
              await conversationRepository.create({
                userId: new Types.ObjectId(String(userId)),
                sessionId,
                messages: [userMsg, assistantMsg],
              } as any);
            }
          } catch (dbErr) {
            console.error('[AI Chat Service DB Error]: Failed to save history:', dbErr);
          }
        },
        tools: {
          getAuditMetrics: {
            description: 'Queries MongoDB to fetch the user\'s total energy consumption and carbon footprint metrics.',
            parameters: createCustomSchema<{}>(
              { type: 'object', properties: {} },
              () => ({ success: true, data: {} })
            ),
            execute: async () => {
              const audits = await esgAuditRepository.find({
                createdBy: new Types.ObjectId(String(userId))
              });

              let totalKwh = 0;
              let totalCarbon = 0;
              audits.forEach((a: any) => {
                totalKwh += a.energyUsageKwh || 0;
                totalCarbon += a.carbonScoreTons || 0;
              });

              return {
                totalKwh,
                totalCarbon,
                facilityCount: audits.length,
              };
            }
          },
          suggestDecarbonizationStrategy: {
            description: 'Calculates the estimated cost savings and recommended structural retrofits based on input carbon metrics.',
            parameters: createCustomSchema<{ totalKwh: number; totalCarbon: number }>(
              {
                type: 'object',
                properties: {
                  totalKwh: { type: 'number', description: 'Total energy usage in kWh' },
                  totalCarbon: { type: 'number', description: 'Total carbon score in tons' }
                },
                required: ['totalKwh', 'totalCarbon']
              },
              (val: any) => {
                const totalKwh = Number(val?.totalKwh);
                const totalCarbon = Number(val?.totalCarbon);
                if (isNaN(totalKwh) || isNaN(totalCarbon)) {
                  return { success: false, error: 'Invalid input metrics.' };
                }
                return { success: true, data: { totalKwh, totalCarbon } };
              }
            ),
            execute: async ({ totalKwh, totalCarbon }: { totalKwh: number; totalCarbon: number }) => {
              let estimatedSavingsUsd = 0;
              let recommendedActions: string[] = [];

              if (totalCarbon > 10000) {
                estimatedSavingsUsd = totalCarbon * 25; // $25 saving per ton
                recommendedActions = [
                  'Transition high-heat manufacturing boilers from gas to green hydrogen/electric loops.',
                  'Onboard microgrid battery storage to smooth out peak demand tariffs.',
                  'Perform deep facility energy audits targeting ventilation thermal recovery.'
                ];
              } else if (totalCarbon > 2000) {
                estimatedSavingsUsd = totalCarbon * 35;
                recommendedActions = [
                  'Deploy variable-speed drives (VSD) on primary cooling tower water pumps.',
                  'Implement automated smart thermostat setbacks during non-operational weekend hours.',
                  'Convert building illumination to high-efficiency LED arrays with occupancy detection.'
                ];
              } else {
                estimatedSavingsUsd = totalCarbon * 45;
                recommendedActions = [
                  'Inspect and replace perimeter cold room door gaskets and window glazing seals.',
                  'Optimize workplace device standby power draws using automated timers.',
                  'Onboard local carbon offset credits to offset unavoidable Scope 3 business logistics.'
                ];
              }

              return {
                estimatedSavingsUsd,
                recommendedActions
              };
            }
          }
        } as any
      });

      return result;
    } catch (error) {
      console.error('[AI Chat Service Error]:', error);
      throw error;
    }
  }
}

export const aiChatService = new AiChatService();
