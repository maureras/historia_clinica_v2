// src/modules/auth/auth.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { verify, JwtPayload, type VerifyOptions } from 'jsonwebtoken';

const RAW_JWT_SECRET = process.env.JWT_SECRET;
if (!RAW_JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = RAW_JWT_SECRET;

// Deben coincidir con los usados para firmar
const VERIFY_OPTIONS: VerifyOptions = {
  issuer: 'clinica-central',
  audience: 'clinica-central-app',
};

type Decoded = JwtPayload & {
  userId?: number | string;
  sub?: number | string;
  rol?: string;
  role?: string;
  email?: string;
};

// 🔧 augment Express.Request
declare global {
  namespace Express {
    interface Request {
      auth?: { userId: number; role?: string; email?: string };
    }
  }
}

function getTokenFromRequest(req: Request): string | null {
  const h = req.get('authorization') || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  const cookie = (req as any).cookies?.token;
  if (typeof cookie === 'string' && cookie.length > 0) return cookie;
  return null;
}

function toNumericId(id: unknown): number | undefined {
  if (typeof id === 'number') return id;
  if (typeof id === 'string') {
    const n = Number(id);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ ok: false, error: 'NO_TOKEN' });

  try {
    const decoded = verify(token, JWT_SECRET, VERIFY_OPTIONS) as Decoded;
    const userId = toNumericId(decoded.userId ?? decoded.sub);
    if (!userId) return res.status(401).json({ ok: false, error: 'TOKEN_INVALID' });

    req.auth = {
      userId,
      role: decoded.rol ?? decoded.role,
      email: decoded.email,
    };
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'TOKEN_INVALID' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) return next();

  try {
    const decoded = verify(token, JWT_SECRET, VERIFY_OPTIONS) as Decoded;
    const userId = toNumericId(decoded.userId ?? decoded.sub);
    if (userId) {
      req.auth = {
        userId,
        role: decoded.rol ?? decoded.role,
        email: decoded.email,
      };
    }
  } catch {
    // ignoramos tokens inválidos en optional
  }
  next();
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth?.role) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ ok: false, error: 'INSUFFICIENT_ROLE' });
    }
    next();
  };
}
