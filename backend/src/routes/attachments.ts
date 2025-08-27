// src/routes/attachments.ts
import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import  prisma  from '../prisma'

const router = Router()

// --- Config storage ---
const STORAGE_DIR = process.env.STORAGE_DIR || './storage/uploads'
fs.mkdirSync(STORAGE_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, STORAGE_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now()
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_')
    cb(null, `${ts}__${safe}`)
  }
})
const upload = multer({ storage })

// --- Utilidades ---
function ensureFileExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    const err: any = new Error('Archivo no encontrado en disco')
    err.status = 404
    throw err
  }
}

/**
 * GET /api/attachments
 * Query: patientId? consultationId?
 * Retorna metadatos de adjuntos (sin stream del archivo)
 */
router.get('/', async (req, res) => {
  try {
    const { patientId, consultationId } = req.query
    const where: any = {}
    if (patientId) where.patientId = String(patientId)
    if (consultationId) where.consultationId = String(consultationId)

    const items = await prisma.uploadedDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return res.json(items)
  } catch (err: any) {
    console.error('GET /attachments error:', err)
    res.status(err.status || 500).json({ message: err.message || 'Error al listar adjuntos' })
  }
})

/**
 * POST /api/attachments
 * Form-Data:
 *  - files[]: uno o varios archivos
 *  - patientId (required)
 *  - consultationId (optional)
 *  - tipo (optional, ej: 'laboratorio' | 'imagen' | 'otro')
 */
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { patientId, consultationId, tipo } = req.body
    if (!patientId) return res.status(400).json({ message: 'patientId es requerido' })

    const files = (req.files as Express.Multer.File[]) || []
    if (files.length === 0) return res.status(400).json({ message: 'No se recibieron archivos' })

    // Mapear a la forma esperada por Prisma
    const createManyData = files.map((f) => ({
      patientId: String(patientId),
      consultationId: consultationId ? String(consultationId) : null,
      tipo: tipo ? String(tipo) : 'otro',
      filename: f.originalname,
      path: path.relative(process.cwd(), f.path),
      mimetype: f.mimetype,
      size: f.size
    }))

    // Guardar en BD
    await prisma.uploadedDocument.createMany({ data: createManyData })

    // Devolver los registros creados
    const created = await prisma.uploadedDocument.findMany({
      where: {
        patientId: String(patientId),
        ...(consultationId ? { consultationId: String(consultationId) } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: files.length
    })

    return res.status(201).json(created)
  } catch (err: any) {
    console.error('POST /attachments error:', err)
    res.status(err.status || 500).json({ message: err.message || 'Error al subir adjuntos' })
  }
})

/**
 * GET /api/attachments/:id/download
 * Descarga el archivo (Content-Disposition: attachment)
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params
    const doc = await prisma.uploadedDocument.findUnique({ where: { id } })
    if (!doc) return res.status(404).json({ message: 'Adjunto no encontrado' })

    const abs = path.isAbsolute(doc.path) ? doc.path : path.join(process.cwd(), doc.path)
    ensureFileExists(abs)

    res.setHeader('Content-Type', doc.mimetype || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.filename)}"`)
    fs.createReadStream(abs).pipe(res)
  } catch (err: any) {
    console.error('GET /attachments/:id/download error:', err)
    res.status(err.status || 500).json({ message: err.message || 'Error al descargar adjunto' })
  }
})

/**
 * GET /api/attachments/:id/inline
 * Visualización inline (ideal para imágenes/pdf en visor del navegador)
 */
router.get('/:id/inline', async (req, res) => {
  try {
    const { id } = req.params
    const doc = await prisma.uploadedDocument.findUnique({ where: { id } })
    if (!doc) return res.status(404).json({ message: 'Adjunto no encontrado' })

    const abs = path.isAbsolute(doc.path) ? doc.path : path.join(process.cwd(), doc.path)
    ensureFileExists(abs)

    res.setHeader('Content-Type', doc.mimetype || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.filename)}"`)
    fs.createReadStream(abs).pipe(res)
  } catch (err: any) {
    console.error('GET /attachments/:id/inline error:', err)
    res.status(err.status || 500).json({ message: err.message || 'Error al abrir adjunto' })
  }
})

/**
 * DELETE /api/attachments/:id
 * Borra BD + archivo en disco si existe
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const doc = await prisma.uploadedDocument.findUnique({ where: { id } })
    if (!doc) return res.status(404).json({ message: 'Adjunto no encontrado' })

    // Borra archivo en disco (no falla si ya no existe)
    try {
      const abs = path.isAbsolute(doc.path) ? doc.path : path.join(process.cwd(), doc.path)
      if (fs.existsSync(abs)) fs.unlinkSync(abs)
    } catch (fsErr) {
      console.warn('No se pudo eliminar el archivo físico:', fsErr)
    }

    await prisma.uploadedDocument.delete({ where: { id } })
    return res.json({ ok: true })
  } catch (err: any) {
    console.error('DELETE /attachments/:id error:', err)
    res.status(err.status || 500).json({ message: err.message || 'Error al eliminar adjunto' })
  }
})

export default router