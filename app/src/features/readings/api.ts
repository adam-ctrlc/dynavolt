import type { LiveReading, Reading, TrendPoint } from '@/features/readings/types';
import { request } from '@/lib/api-client';
import type { Page } from '@/lib/pagination';

export type HistoryFilters = {
  limit?: number;
  offset?: number;
  status?: string;
  q?: string;
};

export function latest(token: string, signal?: AbortSignal) {
  return request<LiveReading>('/readings/latest', { token, signal });
}

export function history(token: string, filters: HistoryFilters = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  if (filters.status) params.set('status', filters.status);
  if (filters.q?.trim()) params.set('q', filters.q.trim());

  return request<Page<Reading>>(`/readings?${params.toString()}`, { token, signal });
}

export function trend(token: string, days = 7, signal?: AbortSignal) {
  return request<TrendPoint[]>(`/readings/trend?days=${days}`, { token, signal });
}
