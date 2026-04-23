export type Language = 'tj' | 'ru' | 'en';
export type DiagnosisFileType = 'image' | 'audio' | 'video';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface Diagnosis {
  id: string;
  carMake: string;
  carModel: string;
  carYear: number;
  fileUrl?: string;
  localUri?: string;
  fileType: DiagnosisFileType;
  problem: string;
  diagnosis: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCostMin?: number | string | null;
  estimatedCostMax?: number | string | null;
  partsNeeded?: string[] | null;
  laborHours?: number | string | null;
  recommendations?: string[] | null;
  urgency?: string | null;
  createdAt: string;
  updatedAt: string;
  agentData?: {
    shops: { name: string; address: string; distance: string }[];
    videos: { title: string; url: string }[];
    partsStores: { store: string; price: number; link: string }[];
    mechanics: { name: string; phone: string; specialty: string }[];
    pricing: { summary: string; comparison: string };
  };
}

export interface DiagnosisListResponse {
  data: Diagnosis[];
  total: number;
  page: number;
  limit: number;
}

export interface Quote {
  id: string;
  diagnosisId: string;
  quotedAmount: number | string;
  mechanicName?: string;
  mechanicNotes?: string;
  verdict: 'FAIR' | 'OVERPRICED' | 'CHEAP';
  percentageDifference?: number | string;
  explanation?: string;
  recommendedRange?: { min: number; max: number };
  breakdown?: { partsEstimate: number; laborEstimate: number; reasonableTotal: number };
  negotiationTips?: string[];
  savingsPotential?: number | string;
  createdAt: string;
}

export interface PartPrice {
  id: string;
  partName: string;
  carMake: string;
  carModel: string;
  carYear?: number | null;
  price: number | string;
  source: string;
  sourceUrl?: string;
  partNumber?: string;
  updatedAt: string;
}

export interface PricingResponse {
  results: PartPrice[];
  cheapest: PartPrice | null;
  averagePrice: number;
  priceRange: { min: number; max: number };
}

export interface ObdAnalysisItem {
  code: string;
  description: string;
  severity: string;
  recommendation: string;
}

export interface ObdLog {
  id: string;
  codes: string[];
  diagnosisId?: string;
  sensorData?: Record<string, number>;
  analysis?: ObdAnalysisItem[];
  overallSeverity?: string;
  createdAt: string;
}

export interface KnownObdCode {
  code: string;
  description: string;
  severity: string;
}

export interface LocalAsset {
  uri: string;
  mimeType: string;
  name: string;
}

export interface VehicleProfile {
  id: string;
  nickname: string;
  make: string;
  model: string;
  year: number;
}

export interface UserProfile {
  name: string;
  city: string;
  email: string;
  phone: string;
  memberSince: string;
  plan: 'Starter' | 'Pro';
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  city: string;
  phone: string;
  plan: 'Starter' | 'Pro';
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}
