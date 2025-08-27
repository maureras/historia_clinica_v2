// backend/src/services/timeline.ts
import prisma from '../prisma'

type TimelineItem =
  | {
      kind: 'consultation'
      id: string
      date: Date
      title: string
      estado?: string | null
      medico?: string | null
      diagnostico?: string | null
    }
  | {
      kind: 'lab'
      id: string
      date: Date
      title: string
      resumen?: string | null
      abnormalCount: number
    }
  | {
      kind: 'document'
      id: string
      date: Date
      title: string
      tipo: string
      mimetype: string
      size: number
    }

export async function getPatientTimeline(patientId: string): Promise<TimelineItem[]> {
  const [consultations, labResults, documents] = await Promise.all([
    prisma.consultation.findMany({
      where: { patientId },
      orderBy: { fecha: 'asc' },
      select: { id: true, fecha: true, motivo: true, estado: true, medico: true, diagnostico: true }
    }),
    prisma.labResult.findMany({
      where: { patientId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, createdAt: true, fechaInforme: true, resumen: true,
        values: { select: { flag: true } }
      }
    }),
    prisma.uploadedDocument.findMany({
      where: { patientId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true, tipo: true, filename: true, mimetype: true, size: true }
    })
  ])

  const items: TimelineItem[] = [
    ...consultations.map(c => ({
      kind: 'consultation' as const,
      id: c.id,
      date: c.fecha,
      title: c.motivo || 'Consulta',
      estado: c.estado,
      medico: c.medico,
      diagnostico: c.diagnostico
    })),
    ...labResults.map(l => ({
      kind: 'lab' as const,
      id: l.id,
      date: (l.fechaInforme ?? l.createdAt) as Date,
      title: 'Resultado de laboratorio',
      resumen: l.resumen,
      abnormalCount: l.values.filter(v => v.flag && v.flag.toLowerCase() !== 'normal').length
    })),
    ...documents.map(d => ({
      kind: 'document' as const,
      id: d.id,
      date: d.createdAt,
      title: d.filename,
      tipo: d.tipo,
      mimetype: d.mimetype,
      size: d.size
    }))
  ]

  // Ordena por fecha ascendente
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return items
}