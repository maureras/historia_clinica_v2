// src/routes/records.ts
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { logAccess } from '../middleware/audit'
import { getPatientTimeline } from '../services/timeline'

const router = Router()

router.get<{ patientId: string }>(
  '/timeline/:patientId',
  requireAuth,
  async (req, res, next) => {
    try {
      await logAccess(req, { recurso: 'records:timeline', accion: 'view' })

      const items = await getPatientTimeline(req.params.patientId)
      return res.json({ data: items })
    } catch (err) {
      return next(err)
    }
  }
)

export default router