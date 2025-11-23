export enum EntityType {
  DRUG = 'DRUG',
  ADE = 'ADE',
  MODIFIER = 'MODIFIER',
  INDICATION = 'INDICATION'
}

export enum SeverityLevel {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  UNKNOWN = 'UNKNOWN'
}

export interface Entity {
  text: string;
  type: EntityType;
  severity?: SeverityLevel;
  description?: string;
}

export interface TamilAnalysis {
  summary: string;
  clinicalReasoning: string;
  suggestedActions: string[];
}

export interface AnalysisResult {
  transcript?: string; // For voice inputs
  detectedLanguage?: string; // For voice inputs
  entities: Entity[];
  summary: string;
  patientAgeGroup: string;
  overallRiskScore: number; // 0-100
  clinicalReasoning: string;
  suggestedActions: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  classification: string;
  tamilAnalysis: TamilAnalysis;
}

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  text: string;
  result: AnalysisResult;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type Theme = 'light' | 'dark';