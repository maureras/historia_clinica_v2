import { Router } from 'express'
import prisma from '../prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { logAccess } from '../middleware/audit'
import { env } from '../config/env'
import type { AuthUser } from '../middleware/auth'
import { requireAuth } from '../middleware/auth'

const router = Router()


// --- Helpers de tipado de rol ---
const ALLOWED_ROLES = ['admin', 'doctor', 'nurse', 'receptionist'] as const
type AllowedRole = typeof ALLOWED_ROLES[number]

function toAllowedRole(value: unknown): AllowedRole | null {
  return (typeof value === 'string' && (ALLOWED_ROLES as readonly string[]).includes(value))
    ? (value as AllowedRole)
    : null
}

// Proyección segura de usuario (sin passwordHash)
const toPublicUser = (u: any) => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  role: u.role,
  speciality: u.speciality ?? null,
  isActive: u.isActive,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
  lastLogin: u.lastLogin ?? null,
})

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    await logAccess(req, { recurso: 'auth', accion: 'login_failed' })
    return res.status(400).json({ message: 'Email y contraseña son requeridos' })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash) {
    await logAccess(req, { recurso: 'auth', accion: 'login_failed' })
    return res.status(401).json({ message: 'Credenciales inválidas' })
  }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    await logAccess(req, { recurso: 'auth', accion: 'login_failed' })
    return res.status(401).json({ message: 'Credenciales inválidas' })
  }

  if (!user.isActive) {
    await logAccess(req, { recurso: 'auth', accion: 'login_failed' })
    return res.status(403).json({ message: 'Usuario inactivo' })
  }
  const role = toAllowedRole(user.role)
  if (!role) {
    await logAccess(req, { recurso: 'auth', accion: 'login_failed' })
    return res.status(500).json({ message: 'Rol de usuario inválido en la base de datos' })
  }

  // opcional: actualiza lastLogin
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  const token = jwt.sign(
    { sub: user.id, role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  // Para que audit guarde actorId correctamente (req.user debe ser AuthUser)
  req.user = { id: String(user.id), role, email: String(user.email) } satisfies AuthUser
  await logAccess(req, { recurso: 'auth', accion: 'login_success' })

  return res.json({
    user: toPublicUser(user),
    token,
  })
})

// GET /auth/me (usa requireAuth: el token ya está validado y tipado)
router.get('/me', requireAuth, async (req, res) => {
  const userId = req.user!.id
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(401).json({ message: 'No autorizado' })
  return res.json({ user: toPublicUser(user) })
})

export default router