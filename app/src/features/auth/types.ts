export type Role = 'admin' | 'user';

export type User = {
  id: string;
  email: string;
  role: Role;
};

export type LoginResponse = {
  token: string;
  user: User;
};
