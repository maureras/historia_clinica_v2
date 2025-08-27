// src/services/reports.ts (FRONT)
// Nota: este servicio está pensado para el frontend (usa fetch, localStorage e import.meta.env)

const API: string = (import.meta as any).env?.VITE_API_URL ?? ''

// Devuelve SIEMPRE un objeto plano de headers (sin unions) para evitar errores de TS
function authHeaders(): Record<string, string> {
  const t = localStorage.getItem('token')
  const h: Record<string, string> = {}
  if (t) h.Authorization = `Bearer ${t}`
  return h
}

// Utils de fechas
export type Dateish = string | Date
const toISODate = (d: Dateish) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10)

// Construye URL con query solo si hay parámetros
function withQuery(path: string, q: URLSearchParams): string {
  const qs = q.toString()
  return `${API}${path}${qs ? `?${qs}` : ''}`
}

// ===================== Overview =====================
export async function getOverview(from?: Dateish, to?: Dateish): Promise<any> {
  const q = new URLSearchParams()
  if (from) q.set('from', toISODate(from))
  if (to) q.set('to', toISODate(to))

  const res = await fetch(withQuery('/reports/overview', q), {
    headers: { Accept: 'application/json', ...authHeaders() } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Overview ${res.status}`)
  return res.json()
}

// ============ Consultas agrupadas ============
export async function getConsultations(
  groupBy: 'day' | 'week' | 'month' | 'doctor',
  from?: Dateish,
  to?: Dateish
): Promise<any> {
  const q = new URLSearchParams({ groupBy })
  if (from) q.set('from', toISODate(from))
  if (to) q.set('to', toISODate(to))

  const res = await fetch(withQuery('/reports/consultations', q), {
    headers: { Accept: 'application/json', ...authHeaders() } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Consultations ${res.status}`)
  return res.json()
}

// ===== Pacientes por género / edades =====
export async function getPatients(segment: 'gender' | 'ageBand'): Promise<any> {
  const q = new URLSearchParams({ segment })
  const res = await fetch(withQuery('/reports/patients', q), {
    headers: { Accept: 'application/json', ...authHeaders() } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Patients ${res.status}`)
  return res.json()
}

// ============ Labs anormales ============
export async function getAbnormalLabs(from?: Dateish, to?: Dateish): Promise<any> {
  const q = new URLSearchParams()
  if (from) q.set('from', toISODate(from))
  if (to) q.set('to', toISODate(to))

  const res = await fetch(withQuery('/reports/labs/abnormal', q), {
    headers: { Accept: 'application/json', ...authHeaders() } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Labs ${res.status}`)
  return res.json()
}

// ============ Actividad de usuarios ============
export async function getUsersActivity(opts?: { role?: string; from?: Dateish; to?: Dateish }): Promise<any> {
  const q = new URLSearchParams()
  if (opts?.role) q.set('role', String(opts.role))
  if (opts?.from) q.set('from', toISODate(opts.from))
  if (opts?.to) q.set('to', toISODate(opts.to))

  const res = await fetch(withQuery('/reports/users/activity', q), {
    headers: { Accept: 'application/json', ...authHeaders() } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Users activity ${res.status}`)
  return res.json()
}

// ============ Export CSV ============
export async function downloadReportCSV(
  kind: 'consultations' | 'patients' | 'labs' | 'prints',
  from?: Dateish,
  to?: Dateish
): Promise<void> {
  const q = new URLSearchParams({ kind })
  if (from) q.set('from', toISODate(from))
  if (to) q.set('to', toISODate(to))

  const res = await fetch(withQuery('/reports/export.csv', q), {
    headers: { ...authHeaders() } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Export ${res.status}`)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const suffix = [from && to ? `${toISODate(from)}_${toISODate(to)}` : undefined].filter(Boolean).join('')
  a.download = suffix ? `${kind}_${suffix}.csv` : `${kind}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ============ Access Logs ==========
export async function getAccessLogs(params?: { userId?: string; from?: Dateish; to?: Dateish; ip?: string; accion?: string }): Promise<any> {
  const q = new URLSearchParams()
  if (params?.userId) q.set('userId', params.userId)
  if (params?.ip) q.set('ip', params.ip)
  if (params?.accion) q.set('accion', params.accion)
  if (params?.from) q.set('from', toISODate(params.from))
  if (params?.to) q.set('to', toISODate(params.to))

  const res = await fetch(withQuery('/reports/access', q), {
    headers: { Accept: 'application/json', ...authHeaders() } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Access logs ${res.status}`)
  return res.json()
}

// ============ Modification Logs ==========
export async function getModificationLogs(params?: { userId?: string; from?: Dateish; to?: Dateish; recurso?: string; accion?: string }): Promise<any> {
  const q = new URLSearchParams()
  if (params?.userId) q.set('userId', params.userId)
  if (params?.recurso) q.set('recurso', params.recurso)
  if (params?.accion) q.set('accion', params.accion)
  if (params?.from) q.set('from', toISODate(params.from))
  if (params?.to) q.set('to', toISODate(params.to))

  const res = await fetch(withQuery('/reports/modifications', q), {
    headers: { Accept: 'application/json', ...authHeaders() } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Modification logs ${res.status}`)
  return res.json()
}

// ============ Print Logs ==========
export async function getPrintLogs(params?: { userId?: string; from?: Dateish; to?: Dateish; recurso?: string; motivo?: string }): Promise<any> {
  const q = new URLSearchParams()
  if (params?.userId) q.set('userId', params.userId)
  if (params?.recurso) q.set('recurso', params.recurso)
  if (params?.motivo) q.set('motivo', params.motivo)
  if (params?.from) q.set('from', toISODate(params.from))
  if (params?.to) q.set('to', toISODate(params.to))

  const res = await fetch(withQuery('/reports/prints', q), {
    headers: { Accept: 'application/json', ...authHeaders() } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Print logs ${res.status}`)
  return res.json()
}

export async function downloadAccessPDF(from?: Dateish, to?: Dateish): Promise<void> {
  const q = new URLSearchParams({ kind: 'access' })
  if (from) q.set('from', toISODate(from))
  if (to) q.set('to', toISODate(to))

  const res = await fetch(withQuery('/reports/export.pdf', q), {
    headers: { ...authHeaders() } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Export PDF ${res.status}`)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const suffix = [from && to ? `${toISODate(from)}_${toISODate(to)}` : undefined].filter(Boolean).join('')
  a.download = suffix ? `access_${suffix}.pdf` : `access.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}


// medical-records/src/services/reports.ts

export type ModificationExportParams = {
  userId?: string
  recurso?: string
  accion?: string
  fieldName?: string
  patientId?: string
  from?: string
  to?: string
}

export async function exportModificationPDF(params: ModificationExportParams = {}): Promise<void> {
  const qs = new URLSearchParams()
  qs.set('kind', 'modifications')
  if (params.userId) qs.set('userId', params.userId)
  if (params.recurso) qs.set('recurso', params.recurso)
  if (params.accion) qs.set('accion', params.accion)
  if (params.fieldName) qs.set('fieldName', params.fieldName)
  if (params.patientId) qs.set('patientId', params.patientId)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)

  // 👇 IMPORTANTE: enviar cookies de sesión
  const res = await fetch(withQuery('/reports/export.pdf', qs), {
    method: 'GET',
    headers: { Accept: 'application/pdf', ...authHeaders() } as HeadersInit,
  })

  // Si vino un error, no intentes “abrir” como PDF
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Error al exportar PDF (${res.status}): ${text || res.statusText}`)
  }

  // Asegura que el servidor respondió un PDF
  const ct = res.headers.get('Content-Type') || ''
  if (!ct.includes('application/pdf')) {
    const text = await res.text().catch(() => '')
    throw new Error(`Respuesta no-PDF recibida: ${ct} ${text ? `— ${text.slice(0,200)}` : ''}`)
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const filename = `modifications_${params.from ?? 'inicio'}_${params.to ?? 'fin'}.pdf`

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}