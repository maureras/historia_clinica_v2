import { Router } from 'express'
import prisma from '../prisma'
import { upload } from '../middleware/upload'

const router = Router()

// util: normalizar fecha y serializar campos JSON
const toISO = (v?: string) => {
  if (!v) return new Date().toISOString()
  // Si viene como "YYYY-MM-DD", interpretar como inicio de día en zona local (Ecuador UTC-5)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number)
    // 00:00 en UTC-5 equivale a 05:00 en UTC
    const utcDate = new Date(Date.UTC(y, (m - 1), d, 5, 0, 0, 0))
    return utcDate.toISOString()
  }
  // Para otros formatos, confiar en Date y normalizar a ISO UTC
  return new Date(v).toISOString()
}
const toStr = (obj: any) => (obj != null ? JSON.stringify(obj) : null)
const parseMaybe = (s?: string | null) => {
  if (!s) return null
  try { return JSON.parse(s) } catch { return null }
}
const hydrate = (row: any) => ({
  ...row,
  signosVitales: parseMaybe(row.signosVitales),
  padecimientoActual: parseMaybe(row.padecimientoActual),
  exploracionFisica: parseMaybe(row.exploracionFisica),
  diagnostico: parseMaybe(row.diagnostico),
  tratamiento: parseMaybe(row.tratamiento),
})

// GET /api/consultations?patientId=...
router.get('/', async (req, res) => {
  try {
    const { patientId } = req.query as { patientId?: string }
    const where = patientId ? { patientId } : {}
    const list = await prisma.consultation.findMany({
      where,
      orderBy: { fecha: 'desc' },
    })
    res.json(list.map(hydrate))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

/**
 * GET /api/consultations/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const row = await prisma.consultation.findUnique({ where: { id } })
    if (!row) return res.status(404).json({ message: 'Consulta no encontrada' })
    return res.json(hydrate(row))
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// PUT /api/consultations/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const d = req.body
    const updated = await prisma.consultation.update({
      where: { id },
      data: {
        patientId: d.patientId,
        fecha: d.fecha ? toISO(d.fecha) : undefined,
        medico: d.medico ?? undefined,
        estado: d.estado ?? undefined,
        motivo: d.motivo ?? undefined,
        resumen: d.resumen ?? undefined,
        signosVitales: d.signosVitales !== undefined ? toStr(d.signosVitales) : undefined,
        padecimientoActual: d.padecimientoActual !== undefined ? toStr(d.padecimientoActual) : undefined,
        exploracionFisica: d.exploracionFisica !== undefined ? toStr(d.exploracionFisica) : undefined,
        diagnostico: d.diagnostico !== undefined ? toStr(d.diagnostico) : undefined,
        tratamiento: d.tratamiento !== undefined ? toStr(d.tratamiento) : undefined,
      },
    })
    res.json(hydrate(updated))
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

/**
 * DELETE /api/consultations/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.consultation.delete({ where: { id } })
    return res.status(204).send()
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return res.status(404).json({ message: 'Consulta no encontrada' })
    }
    return res.status(400).json({ error: e.message })
  }
})

// POST /api/consultations  (JSON o multipart)
router.post('/', upload.array('files', 10), async (req, res) => {
  const t0 = Date.now()
  try {
    const isMultipart = req.is('multipart/form-data')
    const body = isMultipart ? JSON.parse(String(req.body.payload || '{}')) : req.body

    const {
      patientId, fecha, medico, estado, motivo, resumen,
      signosVitales, padecimientoActual, exploracionFisica, diagnostico, tratamiento
    } = body

    const files = (isMultipart && Array.isArray(req.files)) ? (req.files as Express.Multer.File[]) : []
    const labFiles: string[] | undefined = Array.isArray(body.labFiles) ? body.labFiles : undefined

    const created = await prisma.$transaction(async (tx) => {
      // 1) Crear la consulta
      const createdConsult = await tx.consultation.create({
        data: {
          patientId,
          fecha: toISO(fecha),
          medico,
          estado,               // 'borrador' | 'en_progreso' | 'completada'
          motivo: motivo || null,
          resumen: resumen || null,
          signosVitales: toStr(signosVitales),
          padecimientoActual: toStr(padecimientoActual),
          exploracionFisica: toStr(exploracionFisica),
          diagnostico: toStr(diagnostico),
          tratamiento: toStr(tratamiento),
        },
      })

      // 2) Vincular documentos ya existentes (labFiles) en un solo batch
      if (labFiles && labFiles.length > 0) {
        await tx.labResult.createMany({
          data: labFiles.map((docId: string) => ({
            patientId,
            consultationId: createdConsult.id,
            source: 'ocr',
            documentId: docId,
          })),
        })
      }

      // 3) Si hay archivos subidos, crear UploadedDocument y luego vincular con createMany
      if (files.length > 0) {
        const uploadedDocIds: string[] = []
        // Secuencial dentro de la transacción para evitar bloqueos y mantener orden
        for (const f of files) {
          const doc = await tx.uploadedDocument.create({
            data: {
              patientId,
              tipo: 'laboratorio',
              filename: f.originalname,
              mimetype: f.mimetype,
              size: f.size,
              path: f.path,
            },
          })
          uploadedDocIds.push(doc.id)
        }

        if (uploadedDocIds.length > 0) {
          await tx.labResult.createMany({
            data: uploadedDocIds.map((id) => ({
              patientId,
              consultationId: createdConsult.id,
              source: 'ocr',
              documentId: id,
            })),
          })
        }
      }

      return createdConsult
    })

    const totalMs = Date.now() - t0
    console.log('[POST /api/consultations] total in', totalMs, 'ms')

    return res.status(201).json(hydrate(created))
  } catch (e: any) {
    console.error('[POST /api/consultations] error:', e)
    return res.status(400).json({ message: e?.message || 'No se pudo crear la consulta' })
  }
})

export default router