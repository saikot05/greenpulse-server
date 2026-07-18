export interface ICarbonAnalysisPayload {
  data: any[]; // The parsed CSV/JSON records
}

export interface ICarbonSummary {
  totalEmissionsCo2e: number;
  scope1: number;
  scope2: number;
  scope3: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ICarbonAnomaly {
  date: string;
  issue: string;
  severity: 'WARNING' | 'CRITICAL';
}

export interface ICarbonRecommendation {
  title: string;
  action: string;
  estimatedReductionImpact: string;
}

export interface ICarbonChartData {
  name: string;
  value: number;
}

export interface ICarbonAnalysisResponse {
  summary: ICarbonSummary;
  anomalies: ICarbonAnomaly[];
  recommendations: ICarbonRecommendation[];
  chartData: ICarbonChartData[];
}
