// src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db/prisma';
import { AuthService } from './auth.service';

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true, email: true, password: true, rol: true, activo: true,
        nombres: true, apellidos: true
      }
    });

    if (!user) return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    if (!user.activo) return res.status(401).json({ ok: false, error: 'ACCOUNT_DISABLED' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });

    const authUser = {
      id: user.id,
      email: user.email,
      rol: user.rol as any,         // si tienes tipo RolUsuario, castea
      nombre: user.nombres,
      apellido: user.apellidos,
    };

    // 🔐 Firma con AuthService (issuer/audience consistentes)
    const token = AuthService.generateToken(authUser);

    return res.json({ ok: true, user: authUser, token, message: 'LOGIN_OK' });
  } catch (err) {
    console.error('Auth/Login error:', err);
    return res.status(500).json({ ok: false, error: 'LOGIN_FAILED' });
  }
}

// GET /api/auth/me
export async function me(req: Request, res: Response) {
  try {
    if (!req.auth?.userId) return res.status(401).json({ ok: false, error: 'NO_AUTH' });
    const user = await prisma.usuario.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, email: true, rol: true, nombres: true, apellidos: true, activo: true }
    });
    if (!user) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });

    const meUser = {
      id: user.id,
      email: user.email,
      rol: user.rol as any,
      nombre: user.nombres,
      apellido: user.apellidos,
    };

    return res.json({ ok: true, user: meUser });
  } catch (err) {
    console.error('Auth/Me error:', err);
    return res.status(500).json({ ok: false, error: 'ME_FAILED' });
  }
}

// POST /api/auth/logout (opcional)
export async function logout(_req: Request, res: Response) {
  return res.json({ ok: true, message: 'LOGOUT_OK' });
}
