import { getApiBaseUrl } from '../config';
import {
  ApiSuccess,
  AuthResponse,
  AuthUser,
  Diagnosis,
  DiagnosisFileType,
  DiagnosisListResponse,
  KnownObdCode,
  LocalAsset,
  ObdLog,
  PartPrice,
  PricingResponse,
  Quote,
} from '../types';

type RequestMethod = 'GET' | 'POST' | 'DELETE';
let accessToken = '';
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = '';
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10 сония

  try {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    clearTimeout(timeoutId);

    const json = (await response.json()) as ApiSuccess<T> | { message?: string | string[] };

    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    if (!response.ok) {
      const rawMessage = 'message' in json ? json.message : 'Request failed';
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
      throw new Error(message || 'Request failed');
    }

    return (json as ApiSuccess<T>).data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('⏱ Server is not responding. Check your connection.');
      }
      if (error.message === 'Network request failed' || error.message.includes('Network')) {
        throw new Error('📡 No internet connection. Please check your Wi-Fi.');
      }
    }
    throw error;
  }
}

function jsonRequest<T>(path: string, method: RequestMethod, body?: unknown) {
  return request<T>(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function appendAsset(formData: FormData, asset: LocalAsset) {
  formData.append('file', {
    uri: asset.uri,
    type: asset.mimeType,
    name: asset.name,
  } as never);
}

export async function createDiagnosis(input: {
  fileType: DiagnosisFileType;
  asset: LocalAsset;
  carMake: string;
  carModel: string;
  carYear: number;
  description?: string;
  language?: 'tj' | 'ru' | 'en';
  city?: string;
}) {
  const formData = new FormData();
  appendAsset(formData, input.asset);
  formData.append('carMake', input.carMake);
  formData.append('carModel', input.carModel);
  formData.append('carYear', String(input.carYear));

  if (input.description) {
    formData.append('description', input.description);
  }

  if (input.language) {
    formData.append('language', input.language);
  }

  if (input.city) {
    formData.append('city', input.city);
  }

  return request<Diagnosis>(`/diagnosis/${input.fileType}`, {
    method: 'POST',
    body: formData,
  });
}

export function register(input: {
  name: string;
  email: string;
  password: string;
  city?: string;
  phone?: string;
}) {
  return jsonRequest<AuthResponse>('/auth/register', 'POST', input);
}

export function login(input: { email: string; password: string }) {
  return jsonRequest<AuthResponse>('/auth/login', 'POST', input);
}

export function requestPasswordReset(email: string) {
  return jsonRequest<{ message: string }>('/auth/forgot-password', 'POST', { email });
}

export function getMe() {
  return request<AuthUser>('/auth/me');
}

export function listDiagnoses(page = 1, limit = 10) {
  return request<DiagnosisListResponse>(`/diagnosis?page=${page}&limit=${limit}`);
}

export function deleteDiagnosis(id: string) {
  return jsonRequest<{ message: string }>(`/diagnosis/${id}`, 'DELETE');
}

export function getPopularParts() {
  return request<PartPrice[]>('/pricing/popular');
}

export function searchPricing(part: string, carMake?: string, carModel?: string) {
  const params = new URLSearchParams({ part });
  if (carMake) params.append('carMake', carMake);
  if (carModel) params.append('carModel', carModel);
  return request<PricingResponse>(`/pricing/search?${params.toString()}`);
}

export function createQuote(input: {
  diagnosisId: string;
  quotedAmount: number;
  mechanicName?: string;
  mechanicNotes?: string;
}) {
  return jsonRequest<Quote>('/quote', 'POST', input);
}

export function getDiagnosisQuotes(diagnosisId: string) {
  return request<Quote[]>(`/quote/diagnosis/${diagnosisId}`);
}

export function analyzeObd(input: {
  codes: string[];
  diagnosisId?: string;
  sensorData?: Record<string, number>;
}) {
  return jsonRequest<ObdLog>('/obd/analyze', 'POST', input);
}

export function getObdCodes() {
  return request<KnownObdCode[]>('/obd/codes');
}

export function getDiagnosisObdLogs(diagnosisId: string) {
  return request<ObdLog[]>(`/obd/logs/${diagnosisId}`);
}
