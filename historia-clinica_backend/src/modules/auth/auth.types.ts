// src/modules/auth/auth.types.ts

// Roles fuertes para evitar strings arbitrarios
export type RolUsuario = 'ADMIN' | 'MEDICO' | 'ENFERMERA' | 'ADMINISTRATIVO';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;           // <- number para alinear con Prisma (Int)
  email: string;
  rol: RolUsuario;      // <- union tipado
  nombre?: string;
  apellido?: string;
}

export interface JWTPayload {
  userId: number;                 // <- number para alinear con Prisma y el servicio
  email: string;
  rol: RolUsuario;                // <- union tipado
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];        // jsonwebtoken puede poner string o string[]
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
  isLocked?: boolean;
  attemptsRemaining?: number;
}

// (Opcional) Si quieres tipar el log de accesos según tu modelo AccesoLog de Prisma:
export interface AccesoLogEntry {
  id: number;
  fechaAcceso: Date;
  ip?: string | null;
  userAgent?: string | null;
  exitoso: boolean;
  motivoFallo?: string | null;
  usuarioId?: number | null;
  emailIntento: string;
}
