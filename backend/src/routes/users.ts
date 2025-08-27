import { Router } from 'express'
import prisma from '../prisma'
import { hashPassword } from '../lib/crypto'
import { requireAuth, requireRole } from '../middleware/auth'

const ALLOWED_ROLES = ['admin', 'doctor', 'nurse', 'receptionist'] as const
function isAllowedRole(r: any): r is typeof ALLOWED_ROLES[number] {
  return typeof r === 'string' && ALLOWED_ROLES.includes(r as any)
}

const router = Router()
router.use(requireAuth)

function sanitizeUser(u: any) {
  if (!u) return u
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = u
  return rest
}

// GET /api/users
router.get('/', requireRole(['admin']), async (req, res) => {
  const page = Math.max(parseInt(String(req.query.page ?? '1'), 10), 1)

  // Acepta pageSize o limit (alias)
  const pageSizeParam = String(req.query.pageSize ?? req.query.limit ?? '20')
  const pageSize = Math.min(Math.max(parseInt(pageSizeParam, 10) || 20, 1), 100)

  const q = String(req.query.query ?? '').trim()
  const role = String(req.query.role ?? '').trim()
  const isActive = typeof req.query.isActive !== 'undefined'
    ? String(req.query.isActive) === 'true'
    : undefined

  const where: any = {}
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (role) where.role = role
  if (typeof isActive === 'boolean') where.isActive = isActive

  const [total, itemsRaw] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const items = itemsRaw.map(sanitizeUser)
  res.json({ items, total, page, pageSize })
})

/** <<<---  IMPORTANTE: ruta fija ANTES que las paramétricas  --->>> */
// GET /api/users/stats  -> KPIs para las cards
router.get('/stats', requireRole(['admin']), async (_req, res) => {
  try {
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [totalUsers, admins, newThisMonth, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ['admin', 'Admin', 'ADMIN'] } } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart, lt: nextMonthStart } } }),
prisma.user.count({ where: { isActive: true } }),
    ])

    res.json({ totalUsers, admins, newThisMonth, activeUsers })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al calcular estadísticas de usuarios' })
  }
})

/** Rutas paramétricas DESPUÉS de las fijas */

// GET /api/users/:id
router.get('/:id', requireRole(['admin']), async (req, res) => {
  const id = String(req.params.id)
  const u = await prisma.user.findUnique({ where: { id } })
  if (!u) return res.status(404).json({ message: 'Usuario no encontrado' })
  res.json(sanitizeUser(u))
})

// POST /api/users
router.post('/', requireRole(['admin']), async (req, res) => {
  const { email, password, firstName, lastName } = req.body || {}
  let { role, speciality, isActive } = req.body || {}

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: 'email, password, firstName y lastName son obligatorios' })
  }

  const emailNorm = String(email).toLowerCase().trim()
  const exists = await prisma.user.findUnique({ where: { email: emailNorm } })
  if (exists) return res.status(409).json({ message: 'El email ya está en uso' })

  const finalRole = isAllowedRole(role) ? role : 'nurse'
  const finalSpeciality = (typeof speciality === 'string' && speciality.trim() !== '')
    ? String(speciality)
    : null
  const finalIsActive = typeof isActive === 'boolean' ? isActive : true

  const passwordHash = await hashPassword(String(password))

  const created = await prisma.user.create({
    data: {
      email: emailNorm,
      passwordHash,
      firstName: String(firstName),
      lastName: String(lastName),
      role: finalRole,
      speciality: finalSpeciality,
      isActive: finalIsActive,
    },
  })
  return res.status(201).json(sanitizeUser(created))
})

// PUT /api/users/:id
router.put('/:id', requireRole(['admin']), async (req, res) => {
  const id = String(req.params.id)
  const { firstName, lastName, role, speciality, isActive, email } = req.body || {}

  const data: any = {}
  if (typeof firstName === 'string') data.firstName = firstName
  if (typeof lastName === 'string') data.lastName = lastName
  if (isAllowedRole(role)) data.role = role
  if (typeof speciality === 'string' || speciality === null) {
    data.speciality = (typeof speciality === 'string' && speciality.trim() === '') ? null : speciality
  }
  if (typeof isActive === 'boolean') data.isActive = isActive

  if (typeof email === 'string' && email.trim()) {
    const emailNorm = email.toLowerCase().trim()
    const dupe = await prisma.user.findFirst({ where: { email: emailNorm, NOT: { id } } })
    if (dupe) return res.status(409).json({ message: 'El email ya está en uso por otro usuario' })
    data.email = emailNorm
  }

  try {
    const updated = await prisma.user.update({ where: { id }, data })
    res.json(sanitizeUser(updated))
  } catch {
    return res.status(404).json({ message: 'Usuario no encontrado' })
  }
})

// PATCH /api/users/:id
router.patch('/:id', requireRole(['admin']), async (req, res) => {
  const id = String(req.params.id)
  const { firstName, lastName, role, speciality, isActive, email } = req.body || {}

  const data: any = {}
  if (typeof firstName === 'string') data.firstName = firstName
  if (typeof lastName === 'string') data.lastName = lastName
  if (isAllowedRole(role)) data.role = role
  if (typeof speciality === 'string' || speciality === null) {
    data.speciality = (typeof speciality === 'string' && speciality.trim() === '') ? null : speciality
  }
  if (typeof isActive === 'boolean') data.isActive = isActive

  if (typeof email === 'string' && email.trim()) {
    const emailNorm = email.toLowerCase().trim()
    const dupe = await prisma.user.findFirst({ where: { email: emailNorm, NOT: { id } } })
    if (dupe) return res.status(409).json({ message: 'El email ya está en uso por otro usuario' })
    data.email = emailNorm
  }

  try {
    const updated = await prisma.user.update({ where: { id }, data })
    return res.json(sanitizeUser(updated))
  } catch {
    return res.status(404).json({ message: 'Usuario no encontrado' })
  }
})

// PATCH /api/users/:id/status
router.patch('/:id/status', requireRole(['admin']), async (req, res) => {
  const id = String(req.params.id)
  const { isActive } = req.body || {}
  if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive boolean requerido' })

  try {
    const updated = await prisma.user.update({ where: { id }, data: { isActive } })
    res.json(sanitizeUser(updated))
  } catch {
    return res.status(404).json({ message: 'Usuario no encontrado' })
  }
})

// PATCH /api/users/:id/password
router.patch('/:id/password', requireRole(['admin']), async (req, res) => {
  const id = String(req.params.id)
  const { newPassword } = req.body || {}
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ message: 'newPassword (mín 6) requerido' })
  }
  try {
    const passwordHash = await hashPassword(String(newPassword))
    const updated = await prisma.user.update({ where: { id }, data: { passwordHash } })
    res.json({ id: updated.id, message: 'Contraseña actualizada' })
  } catch {
    return res.status(404).json({ message: 'Usuario no encontrado' })
  }
})

// DELETE /api/users/:id  (hard delete)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  const id = String(req.params.id)
  try {
    await prisma.user.delete({ where: { id } })
    return res.json({ id, message: 'Usuario eliminado' })
  } catch (err: any) {
    // Prisma P2003 = viola restricción de FK (tiene datos relacionados)
    if (err?.code === 'P2003') {
      return res.status(409).json({
        message: 'No se puede eliminar: el usuario tiene datos relacionados. ' +
                 'Elimine o reasigne esos datos, o configure onDelete: CASCADE/SET NULL en el esquema.'
      })
    }
    return res.status(404).json({ message: 'Usuario no encontrado' })
  }
})
export default router