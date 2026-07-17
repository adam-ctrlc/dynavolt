export type Role = 'admin' | 'user';

export type User = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};
