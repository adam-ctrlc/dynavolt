import type { Role } from '@/features/auth/types';

export type ManagedUser = {
  id: string;
  email: string;
  username: string;
  role: Role;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  createdAt: string;
};

export type NewUser = {
  email: string;
  password: string;
  role: Role;
  firstName: string;
  middleName: string | null;
  lastName: string;
  /** Optional: the server generates one from the name when omitted. */
  username?: string;
};
