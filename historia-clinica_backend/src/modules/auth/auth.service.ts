// src/modules/auth/auth.service.ts
import bcrypt from 'bcrypt';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../db/prisma';
import { LoginRequest, AuthUser, JWTPayload } from './auth.types';

// ✅ Asegura y tipa el secreto
const RAW_JWT_SECRET = process.env.JWT_SECRET;
if (!RAW_JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: Secret = RAW_JWT_SECRET;

// ✅ Expiración compatible con los tipos de jsonwebtoken
type ExpiresIn = SignOptions['expiresIn'];
const JWT_EXPIRES_IN_ENV = process.env.JWT_EXPIRES_IN;
const JWT_EXPIRES_IN: ExpiresIn = JWT_EXPIRES_IN_ENV
  ? (JWT_EXPIRES_IN_ENV as ExpiresIn) // p.ej. "24h", "7d", "3600"
  : '24h';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  // 🔧 Helper: normaliza ids (string/number) a number
  private static toNumericId(id: unknown): number | undefined {
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
      const n = Number(id);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }

  // Generar JWT
  static generateToken(user: AuthUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      rol: user.rol
    };

    const options: SignOptions = {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'clinica-central',
      audience: 'clinica-central-app',
    };

    return jwt.sign(payload, JWT_SECRET, options);
  }

  // Verificar JWT
  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'clinica-central',
        audience: 'clinica-central-app'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      console.error('❌ Token verification failed:', error instanceof Error ? error.name : 'Unknown error');
      return null;
    }
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verificar password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Check if account is locked
  static isAccountLocked(failedAttempts: number, lastFailedLogin: Date | null): boolean {
    if (failedAttempts >= MAX_LOGIN_ATTEMPTS && lastFailedLogin) {
      const timeSinceLastAttempt = Date.now() - lastFailedLogin.getTime();
      return timeSinceLastAttempt < LOCKOUT_DURATION;
    }
    return false;
  }

  // Reset failed attempts
  static async resetFailedAttempts(userId: number): Promise<void> {
    await prisma.usuario.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lastFailedLogin: null
      }
    });
  }

  // Increment failed attempts
  static async incrementFailedAttempts(userId: number): Promise<void> {
    await prisma.usuario.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
        lastFailedLogin: new Date()
      }
    });
  }

  // 📝 Log de accesos usando tu modelo AccesoLog
  static async logAccess(params: {
    exitoso: boolean;
    emailIntento: string;
    userId?: number;
    ip?: string;
    userAgent?: string;
    motivoFallo?: string; // USER_NOT_FOUND | ACCOUNT_DISABLED | ACCOUNT_LOCKED | INVALID_PASSWORD | SYSTEM_ERROR | LOGOUT
  }): Promise<void> {
    const { exitoso, emailIntento, userId, ip, userAgent, motivoFallo } = params;
    try {
      await prisma.accesoLog.create({
        data: {
          exitoso,
          motivoFallo: motivoFallo ?? null,
          ip: ip ?? null,
          userAgent: userAgent ?? null,
          usuarioId: userId ?? null,
          emailIntento
        }
      });
    } catch (error) {
      console.error('Failed to log access:', error);
    }
  }

  // Login principal
  static async login(
    credentials: LoginRequest,
    clientInfo: { ip?: string; userAgent?: string }
  ): Promise<{
    success: boolean;
    user?: AuthUser;
    token?: string;
    error?: string;
    isLocked?: boolean;
    attemptsRemaining?: number;
  }> {
    const { email, password } = credentials;
    const { ip, userAgent } = clientInfo;

    try {
      console.log('🔍 Login attempt for email:', email.replace(/(.{2}).*(@.*)/, '$1***$2'));

      // Buscar usuario por email
      const usuario = await prisma.usuario.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          password: true,
          rol: true,
          activo: true,
          failedLoginAttempts: true,
          lastFailedLogin: true,
          nombres: true,
          apellidos: true
        }
      });

      // Verificar si el usuario existe
      if (!usuario) {
        console.log('❌ User not found');
        await this.logAccess({
          exitoso: false,
          emailIntento: email,
          ip,
          userAgent,
          motivoFallo: 'USER_NOT_FOUND'
        });

        return { success: false, error: 'Credenciales inválidas' };
      }

      // Verificar si el usuario está activo
      if (!usuario.activo) {
        console.log('❌ User account disabled');
        await this.logAccess({
          exitoso: false,
          userId: usuario.id,
          emailIntento: email,
          ip,
          userAgent,
          motivoFallo: 'ACCOUNT_DISABLED'
        });

        return { success: false, error: 'Cuenta deshabilitada. Contacte al administrador.' };
      }

      // Verificar si la cuenta está bloqueada
      const isLocked = this.isAccountLocked(
        usuario.failedLoginAttempts || 0,
        usuario.lastFailedLogin
      );

      if (isLocked) {
        console.log('❌ Account locked due to multiple failed attempts');
        await this.logAccess({
          exitoso: false,
          userId: usuario.id,
          emailIntento: email,
          ip,
          userAgent,
          motivoFallo: 'ACCOUNT_LOCKED'
        });

        return {
          success: false,
          error: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intente más tarde.',
          isLocked: true
        };
      }

      // Verificar password
      const isPasswordValid = await this.verifyPassword(password, usuario.password);

      if (!isPasswordValid) {
        console.log('❌ Invalid password');

        // Incrementar intentos fallidos
        await this.incrementFailedAttempts(usuario.id);

        const newFailedAttempts = (usuario.failedLoginAttempts || 0) + 1;
        const attemptsRemaining = Math.max(0, MAX_LOGIN_ATTEMPTS - newFailedAttempts);

        await this.logAccess({
          exitoso: false,
          userId: usuario.id,
          emailIntento: email,
          ip,
          userAgent,
          motivoFallo: 'INVALID_PASSWORD'
        });

        return { success: false, error: 'Credenciales inválidas', attemptsRemaining };
      }

      // Login exitoso - resetear intentos fallidos
      if (usuario.failedLoginAttempts && usuario.failedLoginAttempts > 0) {
        await this.resetFailedAttempts(usuario.id);
      }

      // Crear objeto AuthUser (mapea nombres/apellidos -> nombre/apellido)
      const authUser: AuthUser = {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        nombre: usuario.nombres,
        apellido: usuario.apellidos
      };

      // Generar token
      const token = this.generateToken(authUser);

      console.log('✅ Login successful for:', authUser.email);

      await this.logAccess({
        exitoso: true,
        userId: usuario.id,
        emailIntento: usuario.email,
        ip,
        userAgent
      });

      return { success: true, user: authUser, token };
    } catch (error) {
      console.error('❌ Login error:', error);

      await this.logAccess({
        exitoso: false,
        emailIntento: email,
        ip,
        userAgent,
        motivoFallo: 'SYSTEM_ERROR'
      });

      return { success: false, error: 'Error interno del servidor. Intente más tarde.' };
    }
  }

  // Refresh token
  static async refreshToken(oldToken: string): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    try {
      const decoded = this.verifyToken(oldToken);
      if (!decoded) {
        return { success: false, error: 'Token inválido' };
      }

      // 🔧 Normaliza id del token
      const uid = this.toNumericId(decoded.userId);
      if (uid == null) {
        return { success: false, error: 'Token inválido' };
      }

      // Verificar que el usuario sigue activo
      const usuario = await prisma.usuario.findUnique({
        where: { id: uid },
        select: {
          id: true,
          email: true,
          rol: true,
          activo: true,
          nombres: true,
          apellidos: true
        }
      });

      if (!usuario || !usuario.activo) {
        return { success: false, error: 'Usuario no encontrado o inactivo' };
      }

      const authUser: AuthUser = {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        nombre: usuario.nombres,
        apellido: usuario.apellidos
      };

      const newToken = this.generateToken(authUser);

      return { success: true, token: newToken };
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return { success: false, error: 'Error al renovar token' };
    }
  }

  // Logout (registrado como acceso exitoso con motivo LOGOUT)
  static async logout(token: string): Promise<{ success: boolean }> {
    try {
      const decoded = this.verifyToken(token);

      if (decoded) {
        // 🔧 Normaliza id antes de loguear
        const uid = this.toNumericId(decoded.userId);

        await this.logAccess({
          exitoso: true,
          userId: uid, // puede ser undefined si el token trae algo raro
          emailIntento: decoded.email,
          motivoFallo: 'LOGOUT'
        });
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      return { success: true };
    }
  }
}
