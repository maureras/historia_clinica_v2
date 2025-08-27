import { Router } from 'express'
import prisma from '../prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

// POST /api/security/print-logs
router.post('/print-logs', requireAuth, async (req, res) => {
  try {
    const actorId = (req as any).user?.id
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip
    const userAgent = String(req.headers['user-agent'] || '')

    const {
      patientId, documentType, documentId, documentTitle,
      pageCount, reason, urgency, documentHash, printHash, metadata
    } = req.body || {}

    const created = await prisma.printLog.create({
      data: {
        actorId,
        recurso: documentType ?? 'document',
        motivo: reason ?? '',
        ip,
        userAgent,
        // Si tu modelo tiene campos JSON, guarda los extras:
        // extra: { patientId, documentId, documentTitle, pageCount, urgency, documentHash, printHash, metadata }
      }
    })

    res.status(201).json({ id: created.id })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'No se pudo registrar la impresión' })
  }
})

export default router