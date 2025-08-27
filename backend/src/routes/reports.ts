import { Router } from 'express'
import PDFDocument from 'pdfkit'
import prisma from '../prisma'
import { requireAuth, requireRole } from '../middleware/auth'
import { PDFDocument as PDFLibDocument, rgb, degrees } from 'pdf-lib'

const router = Router()


// Helper: safely parse values that may be JSON-serialized or already objects
const parseJsonish = <T = unknown>(v: any): T | null => {
  if (v == null) return null
  if (typeof v === 'object') return v as T
  if (typeof v === 'string') {
    try { return JSON.parse(v) as T } catch { /* ignore parse errors */ }
  }
  return null
}

// ---- Pretty formatting helpers for PDF blocks ----
const camelToLabel = (s: string) =>
  s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim()

const isEmptyVal = (v: any): boolean => {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.keys(v).length === 0
  return false
}

const inlineValue = (v: any): string => {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.filter(x => !isEmptyVal(x)).map(x => inlineValue(x)).join(', ')
  if (typeof v === 'object') {
    return Object.entries(v)
      .filter(([, val]) => !isEmptyVal(val))
      .map(([k, val]) => `${camelToLabel(k)}: ${inlineValue(val)}`)
      .join('; ')
  }
  return String(v)
}

const formatGenericObject = (obj: Record<string, any>): string => {
  const lines: string[] = []
  Object.entries(obj).forEach(([k, v]) => {
    if (isEmptyVal(v)) return
    lines.push(`• ${camelToLabel(k)}: ${inlineValue(v)}`)
  })
  return lines.join('\n')
}

const formatExploracionFisica = (value: any): string => {
  if (!value || typeof value !== 'object') return typeof value === 'string' ? value : ''
  const v = value as Record<string, any>
  const lines: string[] = []

  if (v.exploracionGeneral && typeof v.exploracionGeneral === 'object' && !isEmptyVal(v.exploracionGeneral)) {
    lines.push('— Exploración general —')
    Object.entries(v.exploracionGeneral).forEach(([k, val]) => {
      if (!isEmptyVal(val)) lines.push(`  • ${camelToLabel(k)}: ${inlineValue(val)}`)
    })
  }

  if (v.exploracionSistemas && typeof v.exploracionSistemas === 'object' && !isEmptyVal(v.exploracionSistemas)) {
    if (lines.length) lines.push('')
    lines.push('— Exploración por sistemas —')
    Object.entries(v.exploracionSistemas).forEach(([k, val]) => {
      if (!isEmptyVal(val)) lines.push(`  • ${camelToLabel(k)}: ${inlineValue(val)}`)
    })
  }

  if (!isEmptyVal(v.observacionesGenerales)) {
    if (lines.length) lines.push('')
    lines.push(`Observaciones: ${inlineValue(v.observacionesGenerales)}`)
  }

  if (v.hallazgosEspecificos && typeof v.hallazgosEspecificos === 'object' && !isEmptyVal(v.hallazgosEspecificos)) {
    const h = v.hallazgosEspecificos as Record<string, any>
    const block: string[] = ['— Hallazgos específicos —']
    if (!isEmptyVal(h.hallazgosNormales))  block.push(`  • Normales: ${inlineValue(h.hallazgosNormales)}`)
    if (!isEmptyVal(h.hallazgosAnormales)) block.push(`  • Anormales: ${inlineValue(h.hallazgosAnormales)}`)
    if (!isEmptyVal(h.impresionClinica))  block.push(`  • Impresión clínica: ${inlineValue(h.impresionClinica)}`)
    if (block.length > 1) {
      lines.push('', ...block)
    }
  }

  return lines.length ? lines.join('\n') : formatGenericObject(v)
}

const formatForPdf = (title: string, content: any): string => {
  if (content == null || content === '') return ''
  if (typeof content === 'string') return content
  if (typeof content === 'object') {
    if (title.toLowerCase().includes('exploración')) return formatExploracionFisica(content)
    return formatGenericObject(content as Record<string, any>)
  }
  return String(content)
}
// ---- end formatting helpers ----

function toCSV(rows: any[]): string {
  if (!rows || rows.length === 0) return ''
  const headers = Array.from(
    rows.reduce((set: Set<string>, r: any) => {
      Object.keys(r || {}).forEach(k => set.add(k))
      return set
    }, new Set<string>())
  )
  const esc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = [headers.map(esc).join(',')]
  for (const r of rows) {
    lines.push(headers.map(h => esc((r as any)[h])).join(','))
  }
  return lines.join('\n')
}

function toDateRange(q: any) {
  const now = new Date()
  const to = q?.to ? new Date(String(q.to)) : now
  const from = q?.from ? new Date(String(q.from)) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  // normaliza a 00:00 / 23:59
  const fromStart = new Date(from); fromStart.setHours(0,0,0,0)
  const toEnd = new Date(to); toEnd.setHours(23,59,59,999)
  return { from: fromStart, to: toEnd }
}

router.use(requireAuth, requireRole(['admin','doctor']))

// GET /reports/overview
router.get('/overview', async (req, res) => {
  const { from, to } = toDateRange(req.query)

  const [
    totalPatients,
    totalConsultations,
    consultationsByEstado,
    totalLabs,
    abnormalLabs,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.consultation.count({ where: { fecha: { gte: from, lte: to } } }),
    prisma.consultation.groupBy({
      by: ['estado'],
      _count: { _all: true },
      where: { fecha: { gte: from, lte: to } },
    }),
    prisma.labResult.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.labValue.count({
      where: {
        flag: { not: null, notIn: ['', 'normal', 'NORMAL'] },
        labResult: { createdAt: { gte: from, lte: to } },
      },
    }),
  ])

  const estadoMap: Record<string, number> = {}
  consultationsByEstado.forEach(e => { estadoMap[e.estado ?? 'desconocido'] = e._count._all })

  res.json({
    range: { from, to },
    totals: {
      patients: totalPatients,
      consultations: totalConsultations,
      labs: totalLabs,
      abnormalLabs,
    },
    consultationsByEstado: estadoMap,
    abnormalRate: totalLabs ? Number((abnormalLabs / totalLabs) * 100).toFixed(1) : '0.0',
  })
})

// GET /reports/consultations
router.get('/consultations', async (req, res) => {
  const { from, to } = toDateRange(req.query)
  const groupBy = String(req.query.groupBy || 'day') as 'day'|'week'|'month'|'doctor'

  if (groupBy === 'doctor') {
    type GroupByMedico = { medico: string | null; _count: { _all: number } }
    const rows = (await prisma.consultation.groupBy({
      by: ['medico'],
      _count: { _all: true },
      where: { fecha: { gte: from, lte: to } },
    })) as unknown as GroupByMedico[]

    rows.sort((a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0))
    return res.json(rows.map(r => ({ label: r.medico ?? 'Sin médico', count: r._count?._all ?? 0 })))
  }

  const items = await prisma.consultation.findMany({
    where: { fecha: { gte: from, lte: to } },
    select: { fecha: true },
  })

  const bucket = new Map<string, number>()
  for (const c of items) {
    const d = new Date(c.fecha)
    let key = ''
    if (groupBy === 'day') {
      key = d.toISOString().slice(0,10) 
    } else if (groupBy === 'week') {
      // ISO week key: YYYY-Www
      const dt = new Date(d)
      const dayNum = (dt.getUTCDay() + 6) % 7
      dt.setUTCDate(dt.getUTCDate() - dayNum + 3)
      const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(),0,4))
      const week = 1 + Math.round(((+dt - +firstThursday)/86400000 - 3 + ((firstThursday.getUTCDay()+6)%7))/7)
      key = `${dt.getUTCFullYear()}-W${String(week).padStart(2,'0')}`
    } else { 
      key = d.toISOString().slice(0,7) 
    }
    bucket.set(key, (bucket.get(key) ?? 0) + 1)
  }

  const series = Array.from(bucket.entries())
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }))

  res.json(series)
})

// GET /reports/patients
router.get('/patients', async (req, res) => {
  const segment = String(req.query.segment || 'gender') as 'gender'|'ageBand'
  const patients = await prisma.patient.findMany({
    select: { gender: true, dateOfBirth: true }
  })

  if (segment === 'gender') {
    const counts: Record<string, number> = {}
    for (const p of patients) {
      const g = (p.gender ?? 'unknown').toLowerCase()
      counts[g] = (counts[g] ?? 0) + 1
    }
    return res.json(Object.entries(counts).map(([label, count]) => ({ label, count })))
  }

  const bands = [
    { label: '0-12', min: 0, max: 12 },
    { label: '13-17', min: 13, max: 17 },
    { label: '18-39', min: 18, max: 39 },
    { label: '40-64', min: 40, max: 64 },
    { label: '65+', min: 65, max: 200 },
  ]
  const counts = new Map<string, number>()
  const today = new Date()

  for (const p of patients) {
    let age = null
    if (p.dateOfBirth) {
      const dob = new Date(p.dateOfBirth)
      age = today.getFullYear() - dob.getFullYear()
      const m = today.getMonth() - dob.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
    }
    const band = bands.find(b => age !== null && age >= b.min && age <= b.max)?.label ?? 'Sin fecha'
    counts.set(band, (counts.get(band) ?? 0) + 1)
  }

  const series = bands.map(b => ({ label: b.label, count: counts.get(b.label) ?? 0 }))
  series.push({ label: 'Sin fecha', count: counts.get('Sin fecha') ?? 0 })
  res.json(series)
})

// GET /reports/labs/abnormal
router.get('/labs/abnormal', async (req, res) => {
  const { from, to } = toDateRange(req.query)
  const values = await prisma.labValue.findMany({
    where: {
      flag: { not: null, notIn: ['', 'normal', 'NORMAL'] },
      labResult: { createdAt: { gte: from, lte: to } },
    },
    select: {
      prueba: true, valor: true, unidad: true, flag: true,
      labResult: { select: { id: true, patientId: true, createdAt: true } }
    },
    orderBy: { labResult: { createdAt: 'desc' } },
    take: 200
  })

  const total = await prisma.labResult.count({ where: { createdAt: { gte: from, lte: to } } })
  res.json({ total, count: values.length, items: values })
})

// GET /reports/users/activity
router.get('/users/activity', async (req, res) => {
  const { from, to } = toDateRange(req.query)
  const role = req.query.role ? String(req.query.role) : undefined

  const users = await prisma.user.findMany({
    where: { role: role ? role : undefined },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, lastLogin: true }
  })

  // Conteo de impresiones y consultas por usuario (best-effort)
  const [prints, consults] = await Promise.all([
    prisma.printLog.groupBy({
      by: ['actorId'],
      _count: { _all: true },
      where: { createdAt: { gte: from, lte: to } }
    }),
    // No hay authorId en Consultation; omitimos o lo inferimos si luego lo agregas
    Promise.resolve([] as any[]),
  ])

  const printsMap = new Map<string, number>()
  prints.forEach(p => printsMap.set(p.actorId ?? 'unknown', p._count?._all ?? 0))

  const items = users.map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
    lastLogin: u.lastLogin,
    prints: printsMap.get(u.id) ?? 0,
    consultations: 0, // hasta que tengamos relación autor-consulta
  }))

  res.json({ from, to, total: items.length, items })
})

// GET /reports/access
router.get('/access', async (req, res) => {
  const { from, to } = toDateRange(req.query)
  const actorId = req.query.userId ? String(req.query.userId) : undefined
  const recurso = req.query.recurso ? String(req.query.recurso) : undefined
  const accion = req.query.accion ? String(req.query.accion) : undefined
  const ip = req.query.ip ? String(req.query.ip) : undefined

  const rows = await prisma.accessLog.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      actorId: actorId || undefined,
      recurso: recurso || undefined,
      accion: accion || undefined,
      ip: ip || undefined,
    },
    select: {
      id: true, recurso: true, accion: true, ip: true, userAgent: true, createdAt: true,
      actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 500
  })

  res.json({ from, to, total: rows.length, items: rows })
})

// GET /reports/modifications
router.get('/modifications', requireRole(['admin']), async (req, res) => {
  try {
    const {
      userId,
      recurso,
      accion,
      from,
      to,
      fieldName,
      patientId,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as Record<string, string>

    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
    const skip = (pageNum - 1) * take

    // Filtros básicos
    const where: any = {}
    if (userId) where.actorId = userId
    if (recurso) where.recurso = recurso
    if (accion) where.accion = accion
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(to)
    }

    // Filtrado por contenido del JSON `diff`
    if (fieldName) {
      where.diff = { contains: fieldName }
    }
    if (patientId) {
      where.diff = { ...(where.diff ?? {}), contains: patientId }
    }

    const [total, items] = await Promise.all([
      prisma.modificationLog.count({ where }),
      prisma.modificationLog.findMany({
        where,
        include: { actor: true },
        orderBy: [{ [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' }] as any,
        skip,
        take,
      }),
    ])

    // Aplana `diff` para exponer previousValue/newValue/fieldName/patientId/entityId/patient
    const mapped = items.map((row) => {
      let prev: any = null
      let next: any = null
      let field: string | undefined = undefined
      let pid: string | undefined = undefined
      let entityId: string | undefined = undefined
      let patient: { firstName?: string; lastName?: string } | undefined = undefined

      try {
        const d = row.diff ? JSON.parse(row.diff) : null
        if (d) {
          // IDs principales
          entityId = d.entityId ?? d.patientId ?? d?.entity?.id
          // si es recurso 'patient', usa entityId como patientId por defecto
          pid = d.patientId ?? (row.recurso === 'patient' ? entityId : undefined)

          // Valores directos prev/new/field
          if (d.previousValue !== undefined) prev = d.previousValue
          if (d.newValue !== undefined) next = d.newValue
          if (d.fieldName) field = d.fieldName

          // Si viene un objeto `changes`, toma el primer cambio para vista rápida
          if (!field && d.changes && typeof d.changes === 'object') {
            const k = Object.keys(d.changes)[0]
            field = k
            prev  = d.changes[k]?.from ?? null
            next  = d.changes[k]?.to ?? null
          }

          // Intenta deducir nombre del paciente para deletes
          if (!patient && d.previousValue && typeof d.previousValue === 'object') {
            const fn = d.previousValue.firstName ?? d.previousValue.nombre ?? d.previousValue.name
            const ln = d.previousValue.lastName ?? d.previousValue.apellido
            if (fn || ln) patient = { firstName: fn, lastName: ln }
          }
        }
      } catch { /* ignora parseo de diff */ }

      return {
        id: row.id,
        recurso: row.recurso,
        accion: row.accion,
        createdAt: row.createdAt,

        // 👇 Campos nuevos para que la UI pueda mostrar a quién afectó:
        entityId,
        patientId: pid,
        patient,

        diff: row.diff,
        previousValue: prev,
        newValue: next,
        fieldName: field,

        actor: row.actor ? {
          id: row.actor.id,
          firstName: row.actor.firstName,
          lastName: row.actor.lastName,
          role: row.actor.role,
          email: row.actor.email,
        } : null,
        ip: row.ip,
        userAgent: row.userAgent,
      }
    })

    return res.json({
      items: mapped,
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Error al listar modificaciones' })
  }
})

// GET /reports/prints
router.get('/prints', async (req, res) => {
  const { from, to } = toDateRange(req.query)
  const actorId = req.query.userId ? String(req.query.userId) : undefined
  const recurso = req.query.recurso ? String(req.query.recurso) : undefined
  const motivo = req.query.motivo ? String(req.query.motivo) : undefined
  const ip = req.query.ip ? String(req.query.ip) : undefined

  const rows = await prisma.printLog.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      actorId: actorId || undefined,
      recurso: recurso || undefined,
      motivo: motivo || undefined,
      ip: ip || undefined,
    },
    select: {
      id: true, recurso: true, motivo: true, ip: true, userAgent: true, createdAt: true,
      actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 500
  })

  res.json({ from, to, total: rows.length, items: rows })
})

// ---------------------- EXPORT CSV ----------------------
router.get('/export.csv', async (req, res) => {
  const kind = String(req.query.kind || 'consultations')

  let data: any[] = []
  if (kind === 'consultations') {
    const { from, to } = toDateRange(req.query)
    const rows = await prisma.consultation.findMany({
      where: { fecha: { gte: from, lte: to } },
      select: { fecha: true, estado: true, motivo: true, medico: true, patientId: true },
      orderBy: { fecha: 'desc' }
    })
    data = rows.map(r => ({
      fecha: r.fecha.toISOString(),
      estado: r.estado ?? '',
      medico: r.medico ?? '',
      motivo: r.motivo ?? '',
      patientId: r.patientId
    }))
  } else if (kind === 'patients') {
    const rows = await prisma.patient.findMany({
      select: { firstName: true, lastName: true, gender: true, dateOfBirth: true, email: true, phone: true },
      orderBy: { lastName: 'asc' }
    })
    data = rows.map(r => ({
      nombre: `${r.firstName} ${r.lastName}`,
      genero: r.gender ?? '',
      fechaNacimiento: r.dateOfBirth ? r.dateOfBirth.toISOString().slice(0,10) : '',
      email: r.email ?? '',
      telefono: r.phone ?? '',
    }))
  } else if (kind === 'labs') {
    const { from, to } = toDateRange(req.query)
    const rows = await prisma.labValue.findMany({
      where: { labResult: { createdAt: { gte: from, lte: to } } },
      select: { prueba: true, valor: true, unidad: true, rango: true, flag: true, labResult: { select: { id: true, patientId: true, createdAt: true } } },
      orderBy: { labResult: { createdAt: 'desc' } },
      take: 1000
    })
    data = rows.map(r => ({
      fecha: r.labResult?.createdAt?.toISOString() ?? '',
      patientId: r.labResult?.patientId ?? '',
      prueba: r.prueba,
      valor: r.valor,
      unidad: r.unidad ?? '',
      rango: r.rango ?? '',
      flag: r.flag ?? '',
    }))
  } else if (kind === 'prints') {
    const { from, to } = toDateRange(req.query)
    const rows = await prisma.printLog.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        createdAt: true, recurso: true, motivo: true, ip: true, userAgent: true,
        actor: { select: { firstName: true, lastName: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000
    })
    data = rows.map(r => ({
      fecha: r.createdAt.toISOString(),
      actor: r.actor ? `${r.actor.firstName} ${r.actor.lastName}` : '',
      email: r.actor?.email ?? '',
      rol: r.actor?.role ?? '',
      recurso: r.recurso,
      motivo: r.motivo ?? '',
      ip: r.ip ?? '',
      userAgent: r.userAgent ?? '',
    }))
  } else {
    return res.status(400).send('kind inválido')
  }

  const csv = toCSV(data)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${kind}.csv"`)
  res.send(csv)
})

// ---------------------- EXPORT PDF ----------------------
router.get('/export.pdf', async (req, res) => {
  const kind = String(req.query.kind || '')
  const { from, to } = toDateRange(req.query)

  if (kind === 'access') {
    const rows = await prisma.accessLog.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        createdAt: true,
        recurso: true,
        accion: true,
        ip: true,
        userAgent: true,
        actor: { select: { firstName: true, lastName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })

    const filename = `access_${from.toISOString().slice(0,10)}_${to.toISOString().slice(0,10)}.pdf`
    res.setHeader('Content-Encoding', 'identity')
    res.setHeader('Cache-Control', 'no-store')

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 })
    
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('error', (err) => {
      console.error('[PDFKit] error:', err)
      if (!res.headersSent) res.status(500).send('Error generando PDF')
    })
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks)
      if (!res.headersSent) {
        res.status(200)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Length', String(pdfBuffer.length))
      }
      res.end(pdfBuffer)
    })

    // Título
    doc.fontSize(16).text('Reporte de Accesos', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(10).text(`Desde: ${from.toISOString().slice(0,10)}    Hasta: ${to.toISOString().slice(0,10)}    Total: ${rows.length}`)
    doc.moveDown(1)

    // CORREGIDO: Cálculo preciso de columnas para A4 landscape (842px ancho útil)
    const pageWidth = 842 - 60 // Restamos márgenes
    const headers = ['Fecha/Hora', 'Usuario', 'Email', 'Rol', 'Recurso', 'Acción', 'IP']
    const colW = [110, 140, 160, 80, 100, 80, 112] // Total: 782px
    const colX = [30] // Primera columna
    for (let i = 1; i < colW.length; i++) {
      colX[i] = colX[i-1] + colW[i-1]
    }

    const drawRow = (y: number, cols: string[], bold = false) => {
      doc.fontSize(9)
      bold ? doc.font('Helvetica-Bold') : doc.font('Helvetica')
      cols.forEach((text, i) => {
        const cellText = text.length > 30 ? text.slice(0, 27) + '...' : text
        doc.text(cellText, colX[i], y, { width: colW[i] - 5, lineBreak: false })
      })
      doc.font('Helvetica')
    }

    let y = doc.y + 10
    drawRow(y, headers, true)
    y += 18
    
    // Línea separadora
    doc.moveTo(30, y - 3).lineTo(30 + pageWidth, y - 3).strokeColor('#999').lineWidth(0.5).stroke()
    doc.strokeColor('black').lineWidth(1)

    const bottom = doc.page.height - 50
    for (const r of rows) {
      if (y > bottom - 20) {
        doc.addPage()
        y = 50
        drawRow(y, headers, true)
        y += 18
        doc.moveTo(30, y - 3).lineTo(30 + pageWidth, y - 3).strokeColor('#999').lineWidth(0.5).stroke()
        doc.strokeColor('black').lineWidth(1)
      }

      const fecha = new Date(r.createdAt).toLocaleDateString('es-ES') + ' ' + new Date(r.createdAt).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})
      const usuario = r.actor ? `${r.actor.firstName ?? ''} ${r.actor.lastName ?? ''}`.trim() : ''
      const email = r.actor?.email ?? ''
      const rol = r.actor?.role ?? ''
      const recurso = r.recurso ?? ''
      const accion = r.accion ?? ''
      const ip = r.ip ?? ''

      drawRow(y, [fecha, usuario, email, rol, recurso, accion, ip])
      y += 16
    }

    doc.end()
    return
  }

  if (kind === 'modifications') {
    // filtros opcionales (además del rango)
    const actorId = req.query.userId ? String(req.query.userId) : undefined
    const recurso = req.query.recurso ? String(req.query.recurso) : undefined
    const accion = req.query.accion ? String(req.query.accion) : undefined
    const fieldName = req.query.fieldName ? String(req.query.fieldName) : undefined
    const patientId = req.query.patientId ? String(req.query.patientId) : undefined

    const where: any = {
      createdAt: { gte: from, lte: to },
    }
    if (actorId) where.actorId = actorId
    if (recurso) where.recurso = recurso
    if (accion) where.accion = accion
    if (fieldName) where.diff = { contains: fieldName }
    if (patientId) where.diff = { ...(where.diff ?? {}), contains: patientId }

    const items = await prisma.modificationLog.findMany({
      where,
      include: { actor: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })

    // mapea los campos útiles para el PDF
    const rows = items.map((row) => {
      let prev: any = null
      let next: any = null
      let field: string | undefined = undefined
      let pid: string | undefined = undefined
      let entityId: string | undefined = undefined
      let patientName: string = ''

      try {
        const d = row.diff ? JSON.parse(row.diff) : null
        if (d) {
          entityId = d.entityId ?? d.patientId ?? d?.entity?.id
          pid = d.patientId ?? (row.recurso === 'patient' ? entityId : undefined)

          if (d.previousValue !== undefined) prev = d.previousValue
          if (d.newValue !== undefined) next = d.newValue
          if (d.fieldName) field = d.fieldName

          if (!field && d.changes && typeof d.changes === 'object') {
            const k = Object.keys(d.changes)[0]
            field = k
            prev  = d.changes[k]?.from ?? null
            next  = d.changes[k]?.to ?? null
          }

          // Intenta deducir nombre del paciente
          const pv = d.previousValue
          if (pv && typeof pv === 'object') {
            const fn = pv.firstName ?? pv.nombre ?? pv.name
            const ln = pv.lastName ?? pv.apellido
            if (fn || ln) patientName = `${fn ?? ''} ${ln ?? ''}`.trim()
          }
          if (!patientName && d.patient && typeof d.patient === 'object') {
            const fn = d.patient.firstName ?? d.patient.nombre ?? d.patient.name
            const ln = d.patient.lastName ?? d.patient.apellido
            if (fn || ln) patientName = `${fn ?? ''} ${ln ?? ''}`.trim()
          }
        }
      } catch { /* ignore */ }

      const usuario = row.actor ? `${row.actor.firstName ?? ''} ${row.actor.lastName ?? ''}`.trim() : ''

      return {
        createdAt: row.createdAt,
        usuario,
        accion: row.accion ?? '',
        recurso: row.recurso ?? '',
        paciente: patientName,
        patientId: pid ?? '',
        fieldName: field ?? '',
        previousValue: prev ?? '',
        newValue: next ?? '',
        ip: row.ip ?? '',
      }
    })

    const filename = `modificaciones_${from.toISOString().slice(0,10)}_${to.toISOString().slice(0,10)}.pdf`
    res.setHeader('Content-Encoding', 'identity')
    res.setHeader('Cache-Control', 'no-store')

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('error', (err) => {
      console.error('[PDFKit] error:', err)
      if (!res.headersSent) res.status(500).send('Error generando PDF')
    })
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks)
      if (!res.headersSent) {
        res.status(200)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Length', String(pdfBuffer.length))
      }
      res.end(pdfBuffer)
    })

    // Título
    doc.fontSize(16).text('Reporte de Modificaciones', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(10).text(`Desde: ${from.toISOString().slice(0,10)}    Hasta: ${to.toISOString().slice(0,10)}    Total: ${rows.length}`)
    doc.moveDown(1)

    // CORREGIDO: Columnas más amplias para evitar superposición
    const pageWidth = 842 - 60 // A4 landscape menos márgenes
    const headers = ['Fecha/Hora', 'Usuario', 'Acción', 'Recurso', 'Paciente', 'Campo', 'Anterior', 'Nuevo']
    const colW = [95, 100, 60, 70, 120, 80, 100, 100] // Total: 725px
    const colX = [30]
    for (let i = 1; i < colW.length; i++) {
      colX[i] = colX[i-1] + colW[i-1]
    }

    const drawRow = (y: number, cols: string[], bold = false) => {
      doc.fontSize(9)
      bold ? doc.font('Helvetica-Bold') : doc.font('Helvetica')
      cols.forEach((text, i) => {
        const cellText = String(text ?? '')
        const truncated = cellText.length > 25 ? cellText.slice(0, 22) + '...' : cellText
        doc.text(truncated, colX[i], y, { width: colW[i] - 3, lineBreak: false })
      })
      doc.font('Helvetica')
    }

    let y = doc.y + 10
    drawRow(y, headers, true)
    y += 18
    
    // Línea separadora
    doc.moveTo(30, y - 3).lineTo(30 + pageWidth, y - 3).strokeColor('#999').lineWidth(0.5).stroke()
    doc.strokeColor('black').lineWidth(1)

    const bottom = doc.page.height - 50
    for (const r of rows) {
      if (y > bottom - 20) {
        doc.addPage()
        y = 50
        drawRow(y, headers, true)
        y += 18
        doc.moveTo(30, y - 3).lineTo(30 + pageWidth, y - 3).strokeColor('#999').lineWidth(0.5).stroke()
        doc.strokeColor('black').lineWidth(1)
      }
      
      const fecha = new Date(r.createdAt).toLocaleDateString('es-ES') + ' ' + new Date(r.createdAt).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})
      drawRow(y, [
        fecha,
        r.usuario,
        r.accion,
        r.recurso,
        r.paciente,
        r.fieldName,
        String(r.previousValue ?? ''),
        String(r.newValue ?? ''),
      ])
      y += 16
    }

    doc.end()
    return
  }

  // kind desconocido
  return res.status(400).json({ error: 'kind inválido. Use "access" o "modifications".' })
})

// -------------------- Modifications PDF export --------------------

export type ModificationExportParams = {
  userId?: string
  recurso?: string
  accion?: string
  fieldName?: string
  patientId?: string
  from?: string
  to?: string
}

// POST /api/security/print-logs
router.post('/print-logs', requireAuth, async (req, res) => {
  try {
    const actorId = (req as any).user?.id
    // Tomar IP real del request
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
        // Si tu modelo tiene más campos JSON, puedes guardar los extras aquí:
        // extra: { patientId, documentId, documentTitle, pageCount, urgency, documentHash, printHash, metadata }
      }
    })

    res.status(201).json({ id: created.id })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'No se pudo registrar la impresión' })
  }
})

// GET /reports/medical-record.json (LIGHT)
router.get('/medical-record.json', requireRole(['admin','doctor']), async (req, res) => {
  try {
    const patientId = String(req.query.patientId || '')
    if (!patientId) return res.status(400).json({ message: 'patientId requerido' })
    const { from, to } = toDateRange(req.query)

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true, firstName: true, lastName: true, gender: true, dateOfBirth: true,
        documentType: true, documentNumber: true, phone: true, email: true, 
        address: true, bloodType: true, emergencyContact: true, createdAt: true
      }
    })
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    const [consultations, labResults, documents] = await Promise.all([
      prisma.consultation.findMany({
        where: { patientId, fecha: { gte: from, lte: to } },
        orderBy: { fecha: 'asc' },
        select: {
          id: true,
          fecha: true,
          estado: true,
          motivo: true,
          resumen: true,
          medico: true,
          diagnostico: true,
          tratamiento: true,
          signosVitales: true
        }
      }),
      prisma.labResult.findMany({
        where: {
          patientId,
          OR: [
            { createdAt: { gte: from, lte: to } },
            { fechaInforme: { gte: from, lte: to } }
          ]
        },
        orderBy: [
          { fechaInforme: 'asc' },
          { createdAt: 'asc' }
        ],
        select: {
          id: true,
          createdAt: true,
          fechaInforme: true,
          resumen: true,
          source: true,
          values: {
            select: {
              id: true,
              prueba: true,
              valor: true,
              unidad: true,
              rango: true,
              flag: true,
              categoria: true
            }
          }
        }
      }),
      prisma.uploadedDocument.findMany({
        where: { patientId, createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, tipo: true, filename: true, mimetype: true, size: true, createdAt: true }
      })
    ])

    // === Normalización y DEDUP de laboratorio ===
    const norm = (s?: string) =>
      (s ?? '')
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()

    // Deduplica valores dentro de cada informe por (prueba, unidad, rango, valor)
    const dedupValuesInReport = <T extends { prueba?: string; unidad?: string; rango?: string; valor?: any }>(vals: T[]): T[] => {
      const seen = new Set<string>()
      const out: T[] = []
      for (const v of vals || []) {
        const key = [
          norm(v.prueba).toLowerCase(),
          norm(v.unidad).toLowerCase(),
          norm(v.rango).toLowerCase(),
          norm(String(v.valor)).toLowerCase(),
        ].join('|')
        if (!seen.has(key)) {
          seen.add(key)
          out.push(v)
        }
      }
      return out
    }

    // Consultas (sin cambios funcionales)
    const consultationsLite = consultations.map(c => ({
      id: c.id,
      fecha: c.fecha,
      medico: c.medico ?? '',
      motivo: c.motivo ?? '',
      estado: c.estado ?? '',
      resumen: c.resumen ?? '',
      diagnostico: (c as any).diagnostico ?? null,
      tratamiento: (c as any).tratamiento ?? null,
      signosVitales: (c as any).signosVitales ?? null,
    }))

    // 1) Detalle de laboratorios con DEDUP interno por informe
    const labResultsDetailed = labResults.map(lr => {
      const valores = (lr.values || []).map(v => ({
        id: v.id,
        prueba: v.prueba,
        valor: v.valor,
        unidad: v.unidad || '',
        rango: v.rango || '',
        flag: v.flag || '',
        categoria: (v.categoria && v.categoria.trim()) || 'General'
      }))
      const dedupVals = dedupValuesInReport(valores)
      return {
        id: lr.id,
        fecha: lr.fechaInforme || lr.createdAt,
        source: lr.source || 'ocr',
        resumen: lr.resumen || '',
        values: dedupVals,
      }
    })

    // 2) Aplanado global con DEDUP por (día, categoría, prueba, unidad, rango, valor)
    type Flat = {
      fecha: Date | string | null
      prueba: string
      valor: any
      unidad: string
      rango: string
      flag: string
      categoria: string
      source?: string
    }

    const flatRaw: Flat[] = labResultsDetailed.flatMap(lr =>
      lr.values.map(v => ({
        fecha: lr.fecha,
        prueba: v.prueba,
        valor: v.valor,
        unidad: v.unidad,
        rango: v.rango,
        flag: v.flag,
        categoria: v.categoria || '',
        source: lr.source,
      }))
    )

    const seenFlat = new Set<string>()
    const labValuesFlat: Flat[] = []
    for (const r of flatRaw) {
      const day = (() => {
        if (!r.fecha) return ''
        const d = new Date(r.fecha as any)
        if (isNaN(d.getTime())) return String(r.fecha)
        return d.toISOString().slice(0, 10)
      })()
      const key = [
        day,
        norm(r.categoria).toLowerCase(),
        norm(r.prueba).toLowerCase(),
        norm(r.unidad).toLowerCase(),
        norm(r.rango).toLowerCase(),
        norm(String(r.valor)).toLowerCase(),
      ].join('|')

      if (!seenFlat.has(key)) {
        seenFlat.add(key)
        labValuesFlat.push(r)
      }
    }

    // 3) Solo anormales (compat con `labs`)
    const labAbnormal = labValuesFlat.filter(v => {
      const f = String(v.flag ?? '').toLowerCase()
      return f && f !== 'normal'
    })

    // 3.1) Agrupar lab values por categoría/fecha para la UI (cada categoría en una fila nueva)
    type LabGroupItem = { prueba: string; valor: any; unidad: string; rango: string; flag: string }
    type LabGroup = { categoria: string; fecha: string; resumen?: string; items: LabGroupItem[] }

    const labGroupsMap = new Map<string, { categoria: string; fecha: string; resumen?: string; items: LabGroupItem[]; _seen: Set<string> }>()

    for (const lr of labResultsDetailed) {
      const d = lr.fecha ? new Date(lr.fecha as any) : null
      const day = d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : ''
      for (const v of lr.values) {
        const cat = (v.categoria || 'General').trim()
        const gKey = `${norm(cat).toLowerCase()}|${day}`

        const g = labGroupsMap.get(gKey) ?? {
          categoria: cat,
          fecha: day,
          resumen: lr.resumen || '',
          items: [],
          _seen: new Set<string>(),
        }

        const itemKey = [
          norm(v.prueba).toLowerCase(),
          norm(v.unidad).toLowerCase(),
          norm(v.rango).toLowerCase(),
          norm(String(v.valor)).toLowerCase(),
        ].join('|')

        if (!g._seen.has(itemKey)) {
          g._seen.add(itemKey)
          g.items.push({ prueba: v.prueba, valor: v.valor, unidad: v.unidad, rango: v.rango, flag: v.flag })
        }

        // si el resumen del grupo aún está vacío, toma el del informe
        if (!g.resumen && lr.resumen) g.resumen = lr.resumen

        labGroupsMap.set(gKey, g)
      }
    }

    const labGroups: LabGroup[] = Array.from(labGroupsMap.values())
      .map(({ _seen, ...rest }) => rest)
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
        return a.categoria.toLowerCase().localeCompare(b.categoria.toLowerCase())
      })

    // Documentos: agregado por tipo
    const docsAggMap = new Map<string, { count: number, totalKB: number }>()
    for (const d of documents) {
      const key = d.tipo || 'desconocido'
      const prev = docsAggMap.get(key) ?? { count: 0, totalKB: 0 }
      docsAggMap.set(key, { count: prev.count + 1, totalKB: prev.totalKB + Math.round((d.size || 0) / 1024) })
    }
    const documentsSummary = Array.from(docsAggMap.entries()).map(([tipo, agg]) => ({
      tipo,
      count: agg.count,
      totalKB: agg.totalKB
    }))

    const documentsDetailed = documents.map(d => ({
      id: d.id,
      tipo: d.tipo || 'desconocido',
      filename: (d as any).filename || '',
      mimetype: (d as any).mimetype || '',
      size: d.size || 0,
      createdAt: (d as any).createdAt || null
    }))

    // 4) Respuesta con contadores consistentes con la DEDUP
    return res.json({
      range: { from, to },
      patient,
      counts: {
        consultations: consultationsLite.length,
        labResults: labResultsDetailed.length,
        labValues: labValuesFlat.length,
        abnormalLabValues: labAbnormal.length,
        documents: documents.length
      },
      consultations: consultationsLite,
      labResults: labResultsDetailed,
      labValues: labValuesFlat,
      labGroups: labGroups,
      labs: labAbnormal,          // compat
      documents: documentsDetailed,
      documentsByType: documentsSummary
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error generando historia clínica (JSON)' })
  }
})

// GET /reports/medical-record.pdf CON MARCA DE AGUA
router.get('/medical-record.pdf', requireRole(['admin','doctor']), async (req, res) => {
  try {
    const patientId = String(req.query.patientId || '')
    if (!patientId) return res.status(400).json({ message: 'patientId requerido' })
    const mode = (String(req.query.mode || 'summary') as 'summary'|'full') // default: summary
    const { from, to } = toDateRange(req.query)

    // CAPTURAR PARÁMETROS DE MARCA DE AGUA
    const watermark = req.query.watermark === '1' || (typeof req.query.label === 'string' && req.query.label.trim() !== '')
    const label = String((req.query.label as string) || 'CONFIDENCIAL')

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true, firstName: true, lastName: true, gender: true, dateOfBirth: true,
        documentType: true, documentNumber: true, phone: true, email: true, 
        address: true, bloodType: true, emergencyContact: true, createdAt: true
      }
    })
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    const [consultations, labResults, documents] = await Promise.all([
      prisma.consultation.findMany({
        where: { patientId, fecha: { gte: from, lte: to } },
        orderBy: { fecha: 'asc' },
        select: { 
          id: true, fecha: true, estado: true, motivo: true, resumen: true, medico: true,
          padecimientoActual: true, signosVitales: true, exploracionFisica: true, 
          diagnostico: true, tratamiento: true
        }
      }),
      prisma.labResult.findMany({
        where: {
          patientId,
          OR: [
            { createdAt: { gte: from, lte: to } },
            { fechaInforme: { gte: from, lte: to } }
          ]
        },
        orderBy: [
          { fechaInforme: 'asc' },
          { createdAt: 'asc' }
        ],
        select: {
          id: true, createdAt: true, fechaInforme: true, resumen: true, source: true,
          values: { select: { prueba: true, valor: true, unidad: true, rango: true, flag: true, categoria: true } }
        }
      }),
      prisma.uploadedDocument.findMany({
        where: { patientId, createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, tipo: true, filename: true, size: true, createdAt: true }
      })
    ])

    // Preparación de datos
    const consultRows = consultations.map(c => {
      let signosVitales: any = null
      if (c.signosVitales) {
        try {
          signosVitales = typeof c.signosVitales === 'string' ? JSON.parse(c.signosVitales) : c.signosVitales
        } catch {
          signosVitales = c.signosVitales
        }
      }

      return {
        fecha: new Date(c.fecha).toLocaleDateString('es-ES'),
        medico: c.medico ?? '',
        motivo: c.motivo ?? '',
        estado: c.estado ?? '',
        resumen: c.resumen ?? '',
        padecimientoActual: parseJsonish(c.padecimientoActual) ?? c.padecimientoActual ?? '',
        signosVitales,
        exploracionFisica: parseJsonish(c.exploracionFisica) ?? c.exploracionFisica ?? '',
        diagnostico: parseJsonish(c.diagnostico) ?? c.diagnostico ?? '',
        tratamiento: parseJsonish(c.tratamiento) ?? c.tratamiento ?? ''
      }
    })

    // APLANA + DEDUP por (día, categoría, prueba, unidad, rango, valor)
    const normStr = (s?: string | null) =>
      (s ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim()

    type LabFlat = {
      fechaISO: string            // YYYY-MM-DD para clave
      fecha: string               // fecha visible local
      prueba: string
      valor: any
      unidad: string
      rango: string
      flag: string
      categoria: string
      resumen?: string
      source?: string
    }

    // Aplana con dedup interno por informe
    const flatRaw: LabFlat[] = labResults.flatMap(lr => {
      const date = (lr.fechaInforme || lr.createdAt) ? new Date(lr.fechaInforme || lr.createdAt!) : null
      const fechaISO = date && !isNaN(date.getTime()) ? date.toISOString().slice(0,10) : ''
      const fechaVis = date ? date.toLocaleDateString('es-ES') : ''

      const seenInReport = new Set<string>()
      const vals = (lr.values || []).filter(v => {
        const k = [
          normStr(v.prueba).toLowerCase(),
          normStr(v.unidad).toLowerCase(),
          normStr(v.rango).toLowerCase(),
          normStr(String(v.valor)).toLowerCase(),
        ].join('|')
        if (seenInReport.has(k)) return false
        seenInReport.add(k)
        return true
      })

      return vals.map(v => ({
        fechaISO,
        fecha: fechaVis,
        prueba: v.prueba,
        valor: v.valor,
        unidad: v.unidad || '',
        rango: v.rango || '',
        flag: v.flag || '',
        categoria: (v.categoria && v.categoria.trim()) || 'General',
        resumen: lr.resumen || '',
        source: lr.source || 'ocr',
      }))
    })

    // DEDUP global (día, categoría, prueba, unidad, rango, valor)
    const seenGlobal = new Set<string>()
    const labAll: LabFlat[] = []
    for (const r of flatRaw) {
      const key = [
        r.fechaISO,
        normStr(r.categoria).toLowerCase(),
        normStr(r.prueba).toLowerCase(),
        normStr(r.unidad).toLowerCase(),
        normStr(r.rango).toLowerCase(),
        normStr(String(r.valor)).toLowerCase(),
      ].join('|')
      if (!seenGlobal.has(key)) {
        seenGlobal.add(key)
        labAll.push(r)
      }
    }

    // “summary” solo anormales; “full” todos
    const labRows = mode === 'summary'
      ? labAll.filter(v => {
          const f = String(v.flag || '').toLowerCase()
          return f && f !== 'normal'
        })
      : labAll

    const docsDetailed = documents.map(d => ({
      tipo: d.tipo || 'desconocido',
      filename: d.filename,
      size: Math.round((d.size || 0)/1024),
      fecha: new Date(d.createdAt).toLocaleDateString('es-ES')
    }))

    // Función para generar contenido PDF (evita duplicar código)
    const generatePDFContent = (doc: PDFKit.PDFDocument) => {
      doc.fontSize(16).text('Historia Clínica Completa', { align: 'center' })
      doc.moveDown(0.4)
      doc.fontSize(10).text(
        `Paciente: ${patient.lastName} ${patient.firstName} | Doc: ${(patient.documentType || '')} ${(patient.documentNumber || '')}`,
        { align: 'center' }
      )
      doc.text(`Periodo: ${from.toISOString().slice(0,10)} a ${to.toISOString().slice(0,10)} | Modo: ${mode}`, { align: 'center' })
      doc.moveDown(1)

      const pageBottom = () => doc.page.height - 60
      const pageWidth = 842 - 60

      // ======================== INFORMACIÓN DEL PACIENTE ========================
      doc.font('Helvetica-Bold').fontSize(12).text('Información del Paciente', { continued: false })
      doc.moveDown(0.5)
      doc.font('Helvetica').fontSize(10)
      
      let y = doc.y + 5
      const patientInfo = [
        `Nombre: ${patient.firstName} ${patient.lastName}`,
        `Documento: ${patient.documentType || ''} ${patient.documentNumber || ''}`,
        `Género: ${patient.gender || 'No especificado'}`,
        `Fecha Nacimiento: ${patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('es-ES') : 'No especificada'}`,
        `Teléfono: ${patient.phone || 'No registrado'}`,
        `Email: ${patient.email || 'No registrado'}`,
        `Dirección: ${patient.address || 'No registrada'}`,
        `Tipo Sanguíneo: ${patient.bloodType || 'No registrado'}`,
      ]

      const colWidth = pageWidth / 2 - 20
      for (let i = 0; i < patientInfo.length; i += 2) {
        if (y > pageBottom() - 40) {
          doc.addPage()
          y = 60
        }
        doc.text(patientInfo[i], 30, y, { width: colWidth })
        if (patientInfo[i + 1]) {
          doc.text(patientInfo[i + 1], 30 + colWidth + 20, y, { width: colWidth })
        }
        y += 16
      }

      if (patient.emergencyContact) {
        try {
          const emergency = JSON.parse(patient.emergencyContact)
          doc.moveDown(0.5)
          doc.font('Helvetica-Bold').text('Contacto de Emergencia:', 30, y)
          y += 16
          doc.font('Helvetica')
          doc.text(`${emergency.name || ''} (${emergency.relationship || ''}) - Tel: ${emergency.phone || ''}`, 30, y)
          y += 16
        } catch {
          doc.moveDown(0.5)
          doc.font('Helvetica-Bold').text('Contacto de Emergencia:', 30, y)
          y += 16
          doc.font('Helvetica').text(patient.emergencyContact, 30, y)
          y += 16
        }
      }

      // ======================== CONSULTAS DETALLADAS ========================
      doc.addPage()
      doc.font('Helvetica-Bold').fontSize(12).text('Historial de Consultas Detallado', { continued: false })
      doc.moveDown(0.5)
      
      for (const [index, r] of consultRows.entries()) {
        if (index > 0) doc.addPage()
        
        y = doc.y + 10
        doc.font('Helvetica-Bold').fontSize(11).text(`Consulta ${index + 1} - ${r.fecha}`, 30, y)
        y += 20
        
        doc.font('Helvetica').fontSize(10)
        const basicInfo = [
          [`Médico: ${r.medico}`, `Estado: ${r.estado}`],
          [`Motivo: ${r.motivo}`, ``],
        ]
        
        for (const [left, right] of basicInfo) {
          if (y > pageBottom() - 40) {
            doc.addPage()
            y = 60
          }
          doc.text(left, 30, y, { width: colWidth })
          if (right) doc.text(right, 30 + colWidth + 20, y, { width: colWidth })
          y += 16
        }

        const sections = [
          { title: 'Padecimiento Actual', content: r.padecimientoActual },
          { title: 'Exploración Física', content: r.exploracionFisica },
          { title: 'Diagnóstico', content: r.diagnostico },
          { title: 'Tratamiento', content: r.tratamiento },
          { title: 'Resumen', content: r.resumen }
        ]

        for (const section of sections) {
          if (section.content) {
            if (y > pageBottom() - 40) {
              doc.addPage()
              y = 60
            }
            doc.font('Helvetica-Bold').text(`${section.title}:`, 30, y)
            y += 16

            const textBlock = formatForPdf(section.title, section.content as any)

            doc.font('Helvetica').text(
              textBlock,
              30,
              y,
              { width: pageWidth - 20 }
            )
            y += doc.heightOfString(
              textBlock,
              { width: pageWidth - 20 }
            ) + 8
          }
        }

        if (r.signosVitales) {
          if (y > pageBottom() - 60) {
            doc.addPage()
            y = 60
          }
          doc.font('Helvetica-Bold').text('Signos Vitales:', 30, y)
          y += 16
          doc.font('Helvetica')
          
          if (typeof r.signosVitales === 'object') {
            const vitals = [
              `Presión: ${r.signosVitales.presion || 'N/A'}`,
              `FC: ${r.signosVitales.fc || 'N/A'} bpm`,
              `FR: ${r.signosVitales.fr || 'N/A'} rpm`, 
              `SpO₂: ${r.signosVitales.spo2 || 'N/A'}`,
              `Temperatura: ${r.signosVitales.temperatura || 'N/A'}`
            ]
            
            for (let i = 0; i < vitals.length; i += 2) {
              doc.text(vitals[i], 30, y, { width: colWidth })
              if (vitals[i + 1]) {
                doc.text(vitals[i + 1], 30 + colWidth + 20, y, { width: colWidth })
              }
              y += 16
            }
          } else {
            doc.text(String(r.signosVitales), 30, y)
            y += 16
          }
        }
      }

// ======================== LABORATORIOS DETALLADOS (VERSIÓN EN UNA SOLA LÍNEA) ========================
const norm = (s?: string) =>
  (s ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();

type LabRow = {
  fecha: string;
  prueba: string;
  valor: string;
  unidad: string;
  rango: string;
  flag: string;
  categoria: string;
  resumen?: string;
  source?: string;
};

// --- helpers de fecha ---
const dateTS = (s: string) => {
  const m = s.match(/^(\d{1,2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  const d = new Date(s);
  return isNaN(d.getTime()) ? -Infinity : d.getTime();
};

const totalItems = labRows.length;

if (totalItems > 0) {
  doc.addPage();
  doc.font('Helvetica-Bold').fontSize(12).text('Resultados de Laboratorio Detallados');
  doc.moveDown(1);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const getPageBottom = () => doc.page.height - doc.page.margins.bottom;

  const table = {
    headers: ['Fecha', 'Prueba', 'Valor', 'Unidad', 'Rango', 'Flag'],
    colWidths: [80, 210, 80, 70, 200, 60],
    // límites de caracteres por columna (para mantener 1 línea)
    charLimits: [10, 28, 10, 8, 26, 8],
  };

  const colX: number[] = [doc.page.margins.left];
  for (let i = 0; i < table.colWidths.length - 1; i++) {
    colX.push(colX[i] + table.colWidths[i]);
  }

  // truncar texto a N caracteres
  const truncate = (str: string, limit: number) => {
    const s = String(str || '');
    return s.length > limit ? s.slice(0, limit - 1) + '…' : s;
  };

  // ⬇️ Corregido: dibuja los headers en la MISMA línea (doc.y fijo)
  const drawTableHeader = () => {
    doc.font('Helvetica-Bold').fontSize(9);
    const y0 = doc.y; // baseline fijo para todos los headers
    let maxH = 0;
    table.headers.forEach((h, i) => {
      const w = table.colWidths[i];
      const hgt = doc.heightOfString(h, { width: w });
      if (hgt > maxH) maxH = hgt;
      doc.text(h, colX[i], y0, { width: w, align: 'left', lineBreak: false });
    });
    doc.y = y0 + maxH + 6; // avanzamos UNA sola vez
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor('#aaaaaa')
      .lineWidth(0.5)
      .stroke();
    doc.y += 6;
    doc.strokeColor('black').lineWidth(1);
  };

  drawTableHeader();

  const sortedItems = (labRows as LabRow[]).sort((a, b) => dateTS(b.fecha) - dateTS(a.fecha));

  // altura fija por fila
  const ROW_HEIGHT = 16;

  for (const row of sortedItems) {
    // salto de página si no cabe la siguiente línea
    if (doc.y + ROW_HEIGHT > getPageBottom()) {
      doc.addPage();
      drawTableHeader();
    }

    const isAbnormal = (row.flag || '').toLowerCase() !== '' && (row.flag || '').toLowerCase() !== 'normal';
    const cellTexts = [row.fecha, row.prueba, row.valor, row.unidad, row.rango, row.flag];
    const font = isAbnormal ? 'Helvetica-Bold' : 'Helvetica';

    const startY = doc.y;
    cellTexts.forEach((t, i) => {
      doc.font(font).fontSize(9);
      const truncatedText = truncate(String(t || ''), table.charLimits[i]);
      doc.text(truncatedText, colX[i], startY, {
        width: table.colWidths[i],
        align: 'left',
        lineBreak: false, // no dividir línea
      });
    });
    doc.y = startY + ROW_HEIGHT; // avanzar a la siguiente fila
  }
}
// ======================== FIN LABORATORIOS DETALLADOS ========================

      // ======================== DOCUMENTOS ========================
      if (docsDetailed.length > 0) {
        if (doc.y > pageBottom() - 150 || docsDetailed.length > 5) {
          doc.addPage()
        }
        
        doc.font('Helvetica-Bold').fontSize(12).text('Documentos Adjuntos', { continued: false })
        doc.moveDown(0.5)
        doc.font('Helvetica').fontSize(10)
        
        const headers = ['Archivo', 'Tipo', 'Tamaño (KB)', 'Fecha']
        const colW = [300, 120, 100, 120]
        const colX = [30]
        for (let i = 1; i < colW.length; i++) {
          colX[i] = colX[i-1] + colW[i-1]
        }
        
        let y = doc.y + 10
        
        doc.font('Helvetica-Bold')
        headers.forEach((h, i) => {
          doc.text(h, colX[i], y, { width: colW[i] - 5 })
        })
        y += 18
        doc.moveTo(30, y - 5).lineTo(30 + pageWidth, y - 5).strokeColor('#999').lineWidth(0.5).stroke()
        
        doc.font('Helvetica')
        for (const d of docsDetailed) {
          if (y > pageBottom() - 30) {
            doc.addPage()
            y = 60
          }
          
          const row = [d.filename, d.tipo, String(d.size), d.fecha]
          row.forEach((cell, i) => {
            const text = (cell || '').length > 35 ? cell.slice(0, 32) + '...' : cell || ''
            doc.text(text, colX[i], y, { width: colW[i] - 5 })
          })
          y += 16
        }
      }
    }

    // --- PDF ---
    const filename = `historia_${patient.lastName}_${patient.firstName}_${from.toISOString().slice(0,10)}_${to.toISOString().slice(0,10)}.pdf`
    
    if (!watermark) {
      res.setHeader('Content-Encoding', 'identity')
      res.setHeader('Cache-Control', 'no-store')

      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 })
      const chunks: Buffer[] = []
      doc.on('data', c => chunks.push(c))
      doc.on('error', err => {
        console.error('[PDFKit] error:', err)
        if (!res.headersSent) res.status(500).send('Error generando PDF')
      })
      doc.on('end', () => {
        const pdf = Buffer.concat(chunks)
        if (!res.headersSent) {
          res.status(200)
          res.setHeader('Content-Type', 'application/pdf')
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
          res.setHeader('Content-Length', String(pdf.length))
        }
        res.end(pdf)
      })

      generatePDFContent(doc)
      doc.end()
      return
    }

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 })
      const chunks: Buffer[] = []
      
      doc.on('data', c => chunks.push(c))
      doc.on('error', reject)
      doc.on('end', () => resolve(Buffer.concat(chunks)))

      generatePDFContent(doc)
      doc.end()
    })

    const pdfDoc = await PDFLibDocument.load(pdfBuffer)
    const pages = pdfDoc.getPages()
    
    for (const page of pages) {
      const width = page.getWidth()
      const height = page.getHeight()
      const step = 220
      for (let x = -50; x < width + 50; x += step) {
        for (let y = -20; y < height + 50; y += step) {
          page.drawText(label, {
            x,
            y,
            size: 42,
            color: rgb(0.8, 0.8, 0.8),
            opacity: 0.18,
            rotate: degrees(45),
          })
        }
      }
    }
    
    const watermarkedPdf = await pdfDoc.save()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', String(watermarkedPdf.length))
    res.send(Buffer.from(watermarkedPdf))

  } catch (e) {
    console.error('[reports.medical-record.pdf] error:', e)
    res.status(500).json({ message: 'Error generando historia clínica (PDF)' })
  }
})

export default router