import type { Role } from '@/features/auth/types';
import type { ManagedUser, NewUser, UpdateUser } from '@/features/users/types';
import { request } from '@/lib/api-client';

export type UserFilters = {
  q?: string;
  role?: Role;
};

export function list(token: string, filters: UserFilters = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.role) params.set('role', filters.role);

  const query = params.toString();
  return request<ManagedUser[]>(`/users${query ? `?${query}` : ''}`, { token, signal });
}

export function create(token: string, user: NewUser) {
  return request<void>('/users', { method: 'POST', token, body: user });
}

export function update(token: string, id: string, user: UpdateUser) {
  return request<ManagedUser>(`/users/${id}`, { method: 'PUT', token, body: user });
}

export function remove(token: string, id: string) {
  return request<void>(`/users/${id}`, { method: 'DELETE', token });
}

/** Asks the server for a free username derived from a name. */
export function suggestUsername(token: string, firstName: string, lastName: string) {
  const params = new URLSearchParams({ firstName, lastName });
  return request<{ username: string }>(`/users/username-suggestion?${params.toString()}`, { token });
}
