// src/routes/labs.ts
import { Router } from 'express'
import { PDFDocument, rgb, degrees } from 'pdf-lib'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import  prisma  from '../prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface ValueLike {
  prueba?: unknown
  valor?: unknown
  unidad?: unknown
  rango?: unknown
  flag?: unknown
  categoria?: unknown
}

const router = Router()

// ====== Storage (filesystem) ======
const UPLOAD_ROOT = process.env.STORAGE_DIR || path.resolve(process.cwd(), 'storage/uploads')

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

// Multer: usamos memoria para poder renombrar/guardar nosotros
const upload = multer({ storage: multer.memoryStorage() })

// ====== Gemini ======
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
function hasGemini() {
  return GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 0
}

function buildPrompt(texto: string) {
  // Prompt en español, SOLO JSON. Incluye 'fecha_informe' y 'resumen_hallazgos' como pediste.
  return `
Eres un asistente médico que extrae resultados de laboratorio desde texto libre de un informe clínico en español.

Objetivo: Devolver ÚNICAMENTE un JSON válido (sin comentarios, sin texto extra), con la siguiente estructura:

{
  "fecha_informe": "YYYY-MM-DD" | null,
  "resumen_hallazgos": "string | null", // máx. 100 palabras. Si todo es normal, indícalo claramente.
  "resumen": "string | null",           // resumen breve del informe
  "values": [
    {
      "prueba": "string",                // nombre de la prueba (ej: Hemoglobina)
      "valor": "string",                 // valor crudo (ej: 13.4)
      "unidad": "string | null",         // ej: g/dL
      "rango": "string | null",          // ej: 12-16
      "flag": "string | null",           // ej: alto/bajo/ALTO/BAJO/HIGH/LOW si aplica
      "categoria": "string | null"       // ej: "hematologia", "bioquimica", etc. si se puede inferir
    }
  ]
}

Instrucciones:
- Responde SOLO con el JSON, sin texto adicional.
- Si no encuentras un dato, usa null o deja el campo ausente.
- 'fecha_informe' debe ser YYYY-MM-DD si la identificas, o null si no está claro.
- 'resumen_hallazgos' debe destacar lo anormal en ≤100 palabras; si todo es normal, indícalo.
- 'values' puede estar vacío si no hay pruebas claras.

TEXTO DE ENTRADA:
---
${texto}
---
`
}

async function callGemini(texto: string) {
  if (!hasGemini()) {
    // Fallback si no hay API key: devolvemos estructura mínima para no romper flujo
    return {
      fecha_informe: null,
      resumen_hallazgos: 'No se procesó con IA (GEMINI_API_KEY no configurada).',
      resumen: null,
      values: [] as any[],
    }
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = buildPrompt(texto)
  const resp = await model.generateContent(prompt)
  const txt = await resp.response.text()

  // El modelo debe devolver JSON. Intentamos parsear.
  try {
    return JSON.parse(txt)
  } catch {
    // Si vino con backticks u otro formato, intentamos sanear
    const cleaned = txt.trim().replace(/^```json\s*/i, '').replace(/```$/i, '')
    return JSON.parse(cleaned)
  }
}

function parseFechaYYYYMMDD(s?: string | null): Date | null {
  if (!s) return null
  // Solo aceptamos YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}

async function extractTextFromPdfBuffer(buf: Buffer): Promise<string | null> {
  try {
    // dynamic import to avoid build-time dependency issues
    // @ts-expect-error - pdf-parse has no TypeScript types
    const mod: any = await import('pdf-parse').catch(() => null)
    const pdfParse = mod?.default || mod
    if (!pdfParse) return null
    const data = await pdfParse(buf)
    const text = typeof data?.text === 'string' ? data.text.replace(/\u0000/g, '').trim() : ''
    return text.length ? text : null
  } catch (e: any) {
    console.warn('[labs.analyze] PDF parse failed:', e?.message || e)
    return null
  }
}

// ========= RUTAS =========

// POST /api/labs/analyze
// - multipart/form-data: fields patientId (required), consultationId? (optional), file? (pdf/img), texto? (string)
// - application/x-www-form-urlencoded: patientId, consultationId?, texto
router.post('/analyze', upload.any(), async (req, res) => {
  try {
    const patientId = String(req.body.patientId || '').trim()
    const consultationId = req.body.consultationId ? String(req.body.consultationId).trim() : undefined
    const texto = req.body.texto ? String(req.body.texto) : undefined
    const fechaInformeBody = req.body.fechaInforme ? String(req.body.fechaInforme).trim() : undefined

    // Normalizar archivos: aceptar 'files', 'file' u otros nombres
    const files: Express.Multer.File[] = Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : []

    // Compatibilidad por si alguna vez vino single
    // @ts-ignore
    if (!files.length && req.file) {
      // @ts-ignore
      files.push(req.file as Express.Multer.File)
    }

    // Tomamos el primero para este flujo (si quieres soportar múltiples, iterar aquí)
    const file: Express.Multer.File | undefined = files[0]

    if (!patientId) {
      return res.status(400).json({ error: 'patientId es requerido' })
    }

    // Verificar que exista el paciente
    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' })

    if (consultationId) {
      const consulta = await prisma.consultation.findUnique({ where: { id: consultationId } })
      if (!consulta) return res.status(404).json({ error: 'Consulta no encontrada' })
      if (consulta.patientId !== patientId) {
        return res.status(400).json({ error: 'La consulta no corresponde al paciente' })
      }
    }

    // 1) Si vino archivo, lo persistimos como UploadedDocument (tipo 'laboratorio')
    let documentId: string | undefined
    if (file) {
      await ensureDir(UPLOAD_ROOT)
      const ext = path.extname(file.originalname || '') || ''
      const fname = `${randomUUID()}${ext}`
      const fullPath = path.join(UPLOAD_ROOT, fname)
      await fs.writeFile(fullPath, file.buffer)

      const doc = await prisma.uploadedDocument.create({
        data: {
          patientId,
          tipo: 'laboratorio',
          filename: file.originalname || fname,
          mimetype: file.mimetype || 'application/octet-stream',
          size: file.size || 0,
          path: fullPath,
          ocrStatus: 'pending',
          parsed: false,
        },
      })
      documentId = doc.id
    }

    // 2) Texto de entrada para IA:
    // - Si vino `texto` => lo usamos
    // - Si solo vino archivo => aquí podrías invocar OCR primero; por ahora devolvemos placeholder
    let textoParaIA = texto
    if (!textoParaIA && file) {
      let extracted: string | null = null
      const isPdf = (file.mimetype || '').includes('pdf') || (file.originalname || '').toLowerCase().endsWith('.pdf')
      if (isPdf && file.buffer) {
        extracted = await extractTextFromPdfBuffer(file.buffer as Buffer)
      }
      if (extracted && extracted.trim().length > 0) {
        textoParaIA = extracted
      } else {
        // fallback sin OCR si no podemos extraer texto
        textoParaIA = `Informe de laboratorio adjunto: ${file.originalname || 'archivo'}. Extrae lo que puedas del nombre si es posible.`
      }
    }
    if (!textoParaIA) {
      return res.status(400).json({ error: 'Debes enviar `texto` o un `file`' })
    }

    // 3) Llamada a Gemini
    const ai = await callGemini(textoParaIA)

    // Limpieza/normalización
    const fechaFromAI = parseFechaYYYYMMDD(ai?.fecha_informe ?? null)
    const fechaFromBody = parseFechaYYYYMMDD(fechaInformeBody ?? null)
    const finalFecha = fechaFromBody ?? fechaFromAI
    const resumen = typeof ai?.resumen === 'string' ? ai.resumen : null
    const resumen_hallazgos = typeof ai?.resumen_hallazgos === 'string' ? ai.resumen_hallazgos : null
    const values: ValueLike[] = Array.isArray(ai?.values) ? (ai.values as ValueLike[]) : []

    // --- Idempotency guard: evita crear duplicados si llega dos veces la misma petición ---
    // Estrategia:
    // 1) Si hay documentId (subida de archivo), consideramos (documentId) como clave única.
    // 2) Si NO hay documentId (texto libre), usamos una clave "suave": (patientId + fechaInforme + resumen|resumen_hallazgos).
    let existingLab: any = null;
    if (documentId) {
      existingLab = await prisma.labResult.findFirst({
        where: { documentId },
        include: { values: true, document: true },
      });
    } else {
      const whereSoft: any = { patientId };
      if (finalFecha) whereSoft.fechaInforme = finalFecha;
      const resumenKey = resumen ?? resumen_hallazgos ?? undefined;
      if (resumenKey !== undefined && resumenKey !== null && String(resumenKey).trim() !== '') {
        whereSoft.resumen = String(resumenKey).trim();
      }
      // Solo intentamos el match si tenemos al menos un campo adicional además de patientId
      if (Object.keys(whereSoft).length > 1) {
        existingLab = await prisma.labResult.findFirst({
          where: whereSoft,
          include: { values: true, document: true },
          orderBy: { createdAt: 'desc' },
        });
      }
    }
    if (existingLab) {
      // Devolvemos el existente para mantener idempotencia
      return res.json({ ...existingLab, resumen_hallazgos });
    }

    // 4) Guardar LabResult + LabValue[]
    const created = await prisma.labResult.create({
      data: {
        patientId,
        consultationId,
        source: hasGemini() ? 'ai' : 'ocr',
        fechaInforme: finalFecha ?? undefined,
        resumen: resumen ?? resumen_hallazgos ?? null,
        documentId,
        values: {
          create: values
            .filter((v: ValueLike) => !!v && typeof v.prueba === 'string')
            .map((v: ValueLike) => ({
              prueba: String(v.prueba as string),
              valor:
                typeof v.valor === 'string' || typeof v.valor === 'number'
                  ? String(v.valor)
                  : '',
              unidad: v.unidad != null ? String(v.unidad) : null,
              rango: v.rango != null ? String(v.rango) : null,
              flag: v.flag != null ? String(v.flag) : null,
              categoria: (v.categoria != null && String(v.categoria).trim() !== '') ? String(v.categoria) : 'General',
            })),
        },
      },
      include: {
        values: true,
        document: true,
      },
    })

    // 5) Si hubo archivo, actualizamos flags del documento
    if (documentId) {
      await prisma.uploadedDocument.update({
        where: { id: documentId },
        data: { ocrStatus: 'done', parsed: true },
      })
    }

    const out = {
      ...created,
      resumen_hallazgos,
    }
    return res.json(out)
  } catch (err: any) {
    console.error('[labs.analyze] error:', err)
    return res.status(500).json({ error: err?.message || 'Error procesando laboratorio' })
  }
})

// GET /api/labs/by-consultation?consultationId=XXX
router.get('/by-consultation', async (req, res) => {
  const consultationId = String(req.query.consultationId || '')
  if (!consultationId) return res.status(400).json({ error: 'consultationId es requerido' })

  const labs = await prisma.labResult.findMany({
    where: { consultationId },
    orderBy: { createdAt: 'desc' },
    include: { values: true, document: true },
  })
  res.json(labs)
})

// GET /api/labs/by-patient?patientId=XXX
router.get('/by-patient', async (req, res) => {
  const patientId = String(req.query.patientId || '')
  if (!patientId) return res.status(400).json({ error: 'patientId es requerido' })
  const labs = await prisma.labResult.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    include: { values: true, document: true },
  })
  res.json(labs)
})

export default router

// GET /api/labs/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  try {
    const id = String(req.params.id);
    const watermark = req.query.watermark === '1';
    const label = String(req.query.label || 'CONFIDENCIAL');

    const lab = await prisma.labResult.findUnique({
      where: { id },
      include: { document: true },
    });
    if (!lab || !lab.document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const filePath = lab.document.path;
    const buf = await fs.readFile(filePath);

    if (!watermark) {
      res.contentType(lab.document.mimetype || 'application/pdf');
      return res.send(buf);
    }

    const pdfDoc = await PDFDocument.load(buf);
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      page.drawText(label, {
        x: 50,
        y: page.getHeight() / 2,
        size: 50,
        color: rgb(0.75, 0.75, 0.75),
        opacity: 0.3,
        rotate: degrees(45),
      });
    }
    const watermarked = await pdfDoc.save();
    res.contentType('application/pdf');
    res.send(Buffer.from(watermarked));
  } catch (err: any) {
    console.error('[labs.pdf] error:', err);
    res.status(500).json({ error: 'Error al generar/ver PDF' });
  }
});