import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'
import { requireAuth } from '../middleware/auth'
import { logModification } from '../middleware/audit'
import { extractTextFromPDF, parseLabValuesFromText } from '../services/ocr'
import { analyzeWithGemini } from '../services/gemini'

const prisma = new PrismaClient()
const router = Router()

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date()
    const dir = path.resolve(env.STORAGE_DIR, `${now.getFullYear()}`, `${now.getMonth()+1}`)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const stamp = Date.now()
    const safe = file.originalname.replace(/[^\w\.\-]+/g, '_')
    cb(null, `${stamp}__${safe}`)
  }
})
const upload = multer({ storage })

router.post('/lab/:patientId', requireAuth, upload.single('file'), async (req, res) => {
  const patientId = req.params.patientId
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' })

  const relPath = path.relative(path.resolve(env.STORAGE_DIR), req.file.path).replace(/\\/g, '/')
  const doc = await prisma.uploadedDocument.create({
    data: {
      patientId,
      tipo: 'laboratorio',
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: relPath,
      ocrStatus: 'pending',
      parsed: false
    }
  })

  let resumen = 'Sin resumen'
  let fechaInforme: Date | null = null
  let values: Array<{prueba:string, valor:string, unidad?:string, rango?:string}> = []

  try {
    const fileBuffer = fs.readFileSync(req.file.path)
    const base64 = fileBuffer.toString('base64')

    let ai = await analyzeWithGemini(base64, req.file.mimetype)

    if (ai) {
      resumen = ai.resumen_hallazgos || resumen
      fechaInforme = ai.fecha_informe ? new Date(ai.fecha_informe) : null
      values = ai.resultados ?? []
    } else if (req.file.mimetype === 'application/pdf') {
      const text = await extractTextFromPDF(fileBuffer)
      values = parseLabValuesFromText(text)
    }

    const lab = await prisma.labResult.create({
      data: {
        patientId,
        source: ai ? 'ai' : (values.length > 0 ? 'ocr' : 'manual'),
        fechaInforme: fechaInforme ?? new Date(),
        resumen,
        documentId: doc.id
      }
    })

    if (values.length > 0) {
      await prisma.labValue.createMany({
        data: values.map(v => ({
          labResultId: lab.id,
          prueba: v.prueba,
          valor: v.valor,
          unidad: v.unidad,
          rango: v.rango
        }))
      })
    }

    await prisma.uploadedDocument.update({
      where: { id: doc.id },
      data: { ocrStatus: 'done', parsed: values.length > 0 || !!ai }
    })

    await logModification(req, {
      recurso: 'labResult',
      accion: 'create',
      diff: JSON.stringify({
        entityId: lab.id,
        patientId,
        valuesCount: values.length,
        documentId: doc.id
      })
    })
    res.status(201).json({ ok: true, document: doc, labResult: lab, values })
  } catch (e) {
    console.error('OCR/AI error:', e)
    await prisma.uploadedDocument.update({
      where: { id: doc.id },
      data: { ocrStatus: 'failed', parsed: false }
    })
    res.status(201).json({ ok: true, document: doc, labResult: null, values: [] })
  }
})

export default router
