import type { Alert } from '@/features/alerts/types';
import { request } from '@/lib/api-client';

export function list(token: string, activeOnly: boolean, signal?: AbortSignal) {
  return request<Alert[]>(`/alerts?active=${activeOnly}`, { token, signal });
}

export function acknowledge(token: string, id: number) {
  return request<Alert>(`/alerts/${id}/ack`, { method: 'POST', token });
}
