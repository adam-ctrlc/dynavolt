import type { ConnectionEvent, DeviceStatus, WifiConfig } from '@/features/device/types';
import { request } from '@/lib/api-client';

export function status(token: string, signal?: AbortSignal) {
  return request<DeviceStatus>('/device/status', { token, signal });
}

export function history(token: string, signal?: AbortSignal) {
  return request<ConnectionEvent[]>('/device/history', { token, signal });
}

export function wifi(token: string, signal?: AbortSignal) {
  return request<WifiConfig>('/device/wifi', { token, signal });
}

export function updateWifi(token: string, wifiSsid: string, wifiPassword: string) {
  return request<WifiConfig>('/device/wifi', {
    method: 'PUT',
    token,
    body: { wifiSsid, wifiPassword },
  });
}
