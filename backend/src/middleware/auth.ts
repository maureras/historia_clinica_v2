import { Request, Response, NextFunction } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { env } from '../config/env'

export interface AuthUser {
  id: string
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist'
  email: string
}

// Augmentación de Express para que req.user esté tipado en todo el proyecto
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      user?: AuthUser
    }
  }
}

function isJwtPayload(p: unknown): p is JwtPayload & {
  sub?: string
  id?: string
  role?: AuthUser['role']
  email?: string
} {
  return typeof p === 'object' && p !== null
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'No auth token' })

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as unknown
    if (!isJwtPayload(payload)) {
      return res.status(401).json({ error: 'Invalid token payload' })
    }

    const id = String((payload as any).sub ?? (payload as any).id ?? '')
    const role = (payload as any).role as AuthUser['role'] | undefined
    const email = String((payload as any).email ?? '')

    if (!id || !role) {
      return res.status(401).json({ error: 'Invalid token payload' })
    }

    req.user = { id, role, email }
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Asume que requireAuth ya corrió antes en el router
export function requireRole(roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No auth token' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    return next()
  }
}