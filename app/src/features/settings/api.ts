import { request } from '@/lib/api-client';

export type Thresholds = {
  loadThresholdVa: number;
  tempThresholdC: number;
  updatedAt: string;
};

export function read(token: string) {
  return request<Thresholds>('/settings', { token });
}

export function update(token: string, loadThresholdVa: number, tempThresholdC: number) {
  return request<Thresholds>('/settings', {
    method: 'PUT',
    token,
    body: { loadThresholdVa, tempThresholdC },
  });
}
