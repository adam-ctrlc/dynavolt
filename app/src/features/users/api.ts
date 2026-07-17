import type { ManagedUser, NewUser } from '@/features/users/types';
import { request } from '@/lib/api-client';

export function list(token: string, signal?: AbortSignal) {
  return request<ManagedUser[]>('/users', { token, signal });
}

export function create(token: string, user: NewUser) {
  return request<void>('/users', { method: 'POST', token, body: user });
}

export function remove(token: string, id: string) {
  return request<void>(`/users/${id}`, { method: 'DELETE', token });
}
