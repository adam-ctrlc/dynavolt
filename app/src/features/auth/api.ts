import type { LoginResponse, User } from '@/features/auth/types';
import { request } from '@/lib/api-client';

export function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function profile(token: string) {
  return request<User>('/auth/me', { token });
}
