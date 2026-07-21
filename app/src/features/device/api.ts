import type { ConnectionEvent, DeviceStatus, WifiNetwork } from '@/features/device/types';
import { request } from '@/lib/api-client';

export function status(token: string, signal?: AbortSignal) {
  return request<DeviceStatus>('/device/status', { token, signal });
}

export function history(token: string, signal?: AbortSignal) {
  return request<ConnectionEvent[]>('/device/history', { token, signal });
}

export function networks(token: string, signal?: AbortSignal) {
  return request<WifiNetwork[]>('/device/networks', { token, signal });
}

export function addNetwork(token: string, ssid: string, password: string) {
  return request<WifiNetwork>('/device/networks', {
    method: 'POST',
    token,
    body: { ssid, password },
  });
}

export function selectNetwork(token: string, id: number) {
  return request<WifiNetwork>(`/device/networks/${id}/select`, {
    method: 'PUT',
    token,
  });
}

export function removeNetwork(token: string, id: number) {
  return request<void>(`/device/networks/${id}`, {
    method: 'DELETE',
    token,
  });
}
