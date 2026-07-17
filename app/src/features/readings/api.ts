import type { LiveReading, Reading, TrendPoint } from '@/features/readings/types';
import { request } from '@/lib/api-client';

export function latest(token: string, signal?: AbortSignal) {
  return request<LiveReading>('/readings/latest', { token, signal });
}

export function history(token: string, limit = 100, status?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set('status', status);
  return request<Reading[]>(`/readings?${params.toString()}`, { token });
}

export function trend(token: string, days = 7) {
  return request<TrendPoint[]>(`/readings/trend?days=${days}`, { token });
}
