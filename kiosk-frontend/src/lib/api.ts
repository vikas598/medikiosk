import type { SessionResponse, TurnResponse, FinalizeResponse } from './types';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export interface ApiErrorResponse {
  status: number;
  message: string;
  type: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
}

/**
 * Fetch patient intake session by token.
 * Distinguishes 404 (invalid token) and 410 (expired token).
 */
export const getSessionByToken = async (token: string): Promise<SessionResponse> => {
  try {
    const response = await api.get<SessionResponse>(`/kiosk/sessions/${token.trim()}`);
    return response.data;
  } catch (err: any) {
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status;
      if (status === 404) {
        const error: ApiErrorResponse = {
          status: 404,
          message: 'Invalid token. Please check your token and try again.',
          type: 'INVALID_TOKEN',
        };
        throw error;
      }
      if (status === 410) {
        const error: ApiErrorResponse = {
          status: 410,
          message: 'This token has expired. Please contact hospital staff for assistance.',
          type: 'EXPIRED_TOKEN',
        };
        throw error;
      }
    }
    
    const networkError: ApiErrorResponse = {
      status: 500,
      message: "We're unable to connect right now. Please try again.",
      type: 'NETWORK_ERROR',
    };
    throw networkError;
  }
};

/**
 * Record patient consent.
 */
export const recordConsent = async (sessionId: string, granted: boolean) => {
  const res = await api.post(`/kiosk/sessions/${sessionId}/consent`, { granted });
  return res.data;
};

/**
 * Submit interview turn text response.
 */
export const submitTurn = async (
  sessionId: string,
  responseText: string,
  question?: string,
): Promise<TurnResponse> => {
  const res = await api.post<TurnResponse>(`/kiosk/sessions/${sessionId}/interview/turn`, {
    response: responseText,
    question,
  });
  return res.data;
};

/**
 * Finalize medical session summary.
 */
export const finalizeSession = async (sessionId: string): Promise<FinalizeResponse> => {
  const res = await api.post<FinalizeResponse>(`/kiosk/sessions/${sessionId}/finalize`);
  return res.data;
};

export const getDoctorQueue = async () => {
  const res = await api.get('/doctor/queue');
  return res.data;
};

export const getDoctorSessionDetail = async (sessionId: string) => {
  const res = await api.get(`/doctor/sessions/${sessionId}`);
  return res.data;
};

export const approveDoctorSession = async (sessionId: string, edits?: Record<string, unknown>) => {
  const res = await api.post(`/doctor/sessions/${sessionId}/approve`, { edits: edits || null });
  return res.data;
};