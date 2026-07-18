import axios from 'axios';
import type { ICarbonAnalysisPayload, ICarbonAnalysisResponse } from '../interfaces/carbon.interface.js';

export const analyzeCarbonDataService = async (payload: ICarbonAnalysisPayload): Promise<ICarbonAnalysisResponse> => {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (groqApiKey) {
    try {
      const systemPrompt = `You are the core AI Engine of a production-ready Enterprise Carbon Auditing & Sustainability Platform. Your job is to act as an expert Carbon Data Analyst and Risk Assessor. 

You will receive structured carbon emission records representing energy consumption, fuel usage, supply chain impacts, or waste data from a specific facility.

YOUR TASKS:
1. Data Parsing & Aggregation: Calculate the total carbon footprint (in metric tons of CO2e) across Scope 1 (Direct), Scope 2 (Indirect energy), and Scope 3 (Value chain).
2. Anomaly Detection: Identify sudden spikes or unusual inefficiencies within the logs.
3. Actionable Compliance Insights: Provide exactly 3 specific, practical recommendations to reduce emissions.
4. Risk Categorization: Grade the overall environmental risk level as LOW, MEDIUM, or HIGH.

OUTPUT FORMAT RULES:
- You must reply ONLY with a single valid JSON object.
- Do NOT wrap the JSON in markdown code blocks (No \`\`\`json ... \`\`\`).
- Do NOT include conversational text outside the JSON.
- The JSON must match the following schema strictly:

{
  "summary": {
    "totalEmissionsCo2e": 0.0,
    "scope1": 0.0,
    "scope2": 0.0,
    "scope3": 0.0,
    "riskLevel": "LOW | MEDIUM | HIGH"
  },
  "anomalies": [
    {
      "date": "string",
      "issue": "string",
      "severity": "WARNING | CRITICAL"
    }
  ],
  "recommendations": [
    {
      "title": "string",
      "action": "string",
      "estimatedReductionImpact": "string"
    }
  ],
  "chartData": [
    { "name": "Scope 1", "value": 0.0 },
    { "name": "Scope 2", "value": 0.0 },
    { "name": "Scope 3", "value": 0.0 }
  ]
}`;

      // Sample a subset of the data if it's too large to fit in context
      const recordsToAnalyze = payload.data.slice(0, 50);

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(recordsToAnalyze) }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      return JSON.parse(content) as ICarbonAnalysisResponse;
    } catch (error) {
      console.error('Error calling Groq API:', error);
      throw new Error('Failed to analyze carbon data via Groq AI agent.');
    }
  }

  console.warn('Groq API Key is missing. Returning mock data for UI testing.');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return getMockCarbonData();
};

const getMockCarbonData = (): ICarbonAnalysisResponse => {
  return {
    summary: {
      totalEmissionsCo2e: 1450.5,
      scope1: 450.2,
      scope2: 700.3,
      scope3: 300.0,
      riskLevel: 'MEDIUM'
    },
    anomalies: [
      {
        date: "2023-11-15",
        issue: "Unusual spike in Scope 2 electricity consumption during non-operational hours.",
        severity: "WARNING"
      },
      {
        date: "2023-12-02",
        issue: "Significant increase in fleet fuel usage unaccounted for by delivery logs.",
        severity: "CRITICAL"
      }
    ],
    recommendations: [
      {
        title: "Optimize HVAC Scheduling",
        action: "Implement smart thermostats to reduce heating/cooling outside of business hours.",
        estimatedReductionImpact: "15% reduction in Scope 2 emissions"
      },
      {
        title: "Fleet Route Optimization",
        action: "Deploy AI-driven route planning for delivery trucks to minimize idle time and mileage.",
        estimatedReductionImpact: "10% reduction in Scope 1 emissions"
      },
      {
        title: "Supplier Engagement Program",
        action: "Work with top tier-1 suppliers to set science-based emission reduction targets.",
        estimatedReductionImpact: "Up to 20% reduction in Scope 3 emissions over 2 years"
      }
    ],
    chartData: [
      { name: "Scope 1", value: 450.2 },
      { name: "Scope 2", value: 700.3 },
      { name: "Scope 3", value: 300.0 }
    ]
  };
};
