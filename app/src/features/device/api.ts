import type { DeviceStatus } from '@/features/device/types';
import { request } from '@/lib/api-client';

export function status(token: string, signal?: AbortSignal) {
  return request<DeviceStatus>('/device/status', { token, signal });
}
