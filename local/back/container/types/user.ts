export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'worker';
  is_active: boolean;
  created_at: string;
  position?: string; // For display purposes
}

export interface CreateUserData {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: 'worker';
  pin?: string;
}