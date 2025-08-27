// src/services/users.ts
export type CreateUserInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'doctor' | 'nurse';
  speciality?: string | null;
  isActive?: boolean;
};

export async function createUser(input: CreateUserInput) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`, // si usas JWT
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Error creando usuario: ${res.status}`);
  }

  return res.json(); // retorna el usuario SANEADO
}

export type UserStats = {
  total: number;
  admins: number;
  active: number;
  newThisMonth: number;
  meta?: {
    activeByFlag: number;
    activeByLogin: number;
    windowDaysForLogin: number;
    month: string;
  };
};

export async function getUserStats(): Promise<UserStats> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/stats`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Error obteniendo stats: ${res.status} ${text}`);
  }
  return res.json();
}