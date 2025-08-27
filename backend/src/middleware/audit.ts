// backend/src/middleware/audit.ts
import type { Request, Response, NextFunction } from 'express'
import prisma from '../prisma'


type AuthUser = { id?: string; email?: string; role?: string } | undefined

function getClientIp(req: Request): string | null {
  // Respeta proxies / balanceadores
  const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
  const ip = xff || req.socket.remoteAddress || null
  // Normaliza ::ffff:127.0.0.1 -> 127.0.0.1
  return ip?.startsWith('::ffff:') ? ip.slice(7) : ip
}


export async function logAccess(
  req: Request,
  {
    recurso,
    accion,
    motivo,
  }: {
    recurso: string
    accion: string
    motivo?: string | null
  }
): Promise<void> {
  try {
    const user: AuthUser = (req as any).user
    const actorId = user?.id ?? null
    const ip = getClientIp(req)
    const userAgent = req.headers['user-agent'] ?? null

    await prisma.accessLog.create({
      data: {
        actorId,                   // String | null
        recurso,                   // String
        accion,                    // String
        ip: ip ?? undefined,       // String?
        userAgent: (userAgent as string | null) ?? undefined, // String?
        // createdAt lo setea Prisma por default
      },
    })
  } catch (err) {

    console.error('AccessLog error:', (err as Error).message)
  }
}

export function audit(
  recurso: string,
  accion: string,
  opts?: { when?: 'before' | 'after'; motivo?: string | null }
) {
  const when = opts?.when ?? 'after'
  const motivo = opts?.motivo ?? null

  if (when === 'before') {
    // Logear ANTES de ejecutar el handler
    return async (req: Request, _res: Response, next: NextFunction) => {
      await logAccess(req, { recurso, accion, motivo })
      next()
    }
  }

  // Logear DESPUÉS de responder (recomendado)
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      const failed = res.statusCode >= 400
      const finalAccion = failed ? `${accion}_failed` : accion
      // No await para no bloquear el cierre del response
      void logAccess(req, { recurso, accion: finalAccion, motivo })
    })
    next()
  }
}




// Tipos simples (compat con tu UI)
type ModAction = 'create' | 'update' | 'delete' | 'restore'

interface LogModificationInput {
  recurso: string                 // ej: 'patient' | 'user' | 'consultation'
  accion: ModAction               // create | update | delete | restore
  entityId?: string               // id del recurso afectado
  patientId?: string              // opcional si aplica
  fieldName?: string              // si quieres destacar 1 campo
  previousValue?: unknown         // valor anterior (simple)
  newValue?: unknown              // valor nuevo (simple)
  diff?: unknown                  // estructura de cambios (se serializa a JSON)
}

export async function logModification(req: Request, input: LogModificationInput) {
  const actorId = (req as any)?.user?.id ?? null
  const payload = input.diff ?? {
    entityId: input.entityId,
    patientId: input.patientId,
    fieldName: input.fieldName,
    previousValue: input.previousValue,
    newValue: input.newValue,
  }

  await prisma.modificationLog.create({
    data: {
      actorId,
      recurso: input.recurso,
      accion: input.accion,
      diff: JSON.stringify(payload),
      ip: req.ip,
      userAgent: req.get('user-agent') || null,
    },
  })
}