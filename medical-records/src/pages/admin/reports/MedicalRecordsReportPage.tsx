// src/pages/admin/reports/MedicalRecordsReportPage.tsx
import React from 'react'
import { Card, Button, Alert } from '@/components/ui'
import { Search as SearchIcon, Download, User as UserIcon, IdCard } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

// ===== Tipos del backend =====
type ApiCounts = {
  consultations: number
  labResults: number
  labValues: number
  abnormalLabValues: number
  documents: number
}

type ApiConsultation = {
  id: string
  fecha: string
  estado?: string | null
  motivo?: string | null
  resumen?: string | null
  medico?: string | null
  diagnostico?: string | null
  tratamiento?: string | null
  signosVitales?: string | null
}

// Valores de laboratorio (forma plana: backend.labValues y backend.labs)
type ApiLabValue = {
  fecha: string
  prueba: string
  valor: string
  unidad: string
  rango: string
  flag: string
  categoria: string
  source?: string
}

// Resultado de laboratorio con sus valores (backend.labResults)
type ApiLabResult = {
  id: string
  fecha: string
  source?: string
  resumen?: string
  values: ApiLabValue[]
}

// Resumen de documentos (tal como lo retorna el backend)
type ApiDocsSummary = {
  byType: { tipo: string; count: number; totalKB: number }[]
}

type ApiResponse = {
  range: { from: string; to: string }
  patient: {
    id: string
    firstName: string
    lastName: string
    gender?: string | null
    dateOfBirth?: string | null
    documentType?: string | null
    documentNumber?: string | null
  }
  counts: ApiCounts
  consultations: ApiConsultation[]
  labResults: ApiLabResult[]   // detallado, por informe
  labValues: ApiLabValue[]     // todos los valores (aplanado)
  labs: ApiLabValue[]          // solo anormales (compat)
  documents: ApiDocsSummary    // { byType: [...] }
}

// ===== Utilidades de red =====
const API_BASE: string = `${(((import.meta as any).env?.VITE_API_URL) ?? '').replace(/\/$/, '')}`
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path)

// Construye HeadersInit válido (evita unión incompatible para TS)
const buildHeaders = (accept: string): HeadersInit => {
  const h: Record<string, string> = { Accept: accept }
  const t = localStorage.getItem('token')
  if (t) h.Authorization = `Bearer ${t}`
  return h
}

// Resultado mínimo de paciente para el autocompletado
type PatientLite = {
  id: string
  firstName: string
  lastName: string
  documentType?: string | null
  documentNumber?: string | null
}

// Normalizador para respuestas variadas
const normalizePatients = (raw: any): PatientLite[] => {
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : raw.patients || [])
  return arr
    .map((p: any) => ({
      id: String(p.id),
      firstName: String(p.firstName ?? p.nombre ?? ''),
      lastName: String(p.lastName ?? p.apellido ?? ''),
      documentType: p.documentType ?? null,
      documentNumber: p.documentNumber ?? null,
    }))
    .filter((p: PatientLite) => p.id && (p.firstName || p.lastName))
}

// Coincidencia local por nombre y documento (case-insensitive)
const matchesQuery = (p: PatientLite, q: string) => {
  const s = q.toLowerCase().trim()
  if (!s) return true
  const name = `${p.firstName} ${p.lastName}`.toLowerCase()
  const rev  = `${p.lastName} ${p.firstName}`.toLowerCase()
  const doc  = String(p.documentNumber ?? '').toLowerCase()
  return name.includes(s) || rev.includes(s) || doc.includes(s)
}

// Nombre visible "Apellido Nombre"
const displayName = (p: PatientLite) => `${p.lastName} ${p.firstName}`.trim()

// Intenta varias rutas conocidas para búsqueda de pacientes
const MIN_QUERY = 1

async function searchPatients(query: string): Promise<PatientLite[]> {
  if (!query || query.trim().length < MIN_QUERY) return []
  const qs = encodeURIComponent(query.trim())
  // Prioriza endpoints existentes tipo /api/patients?search= o ?q=
  const candidates = [
    `/api/patients?search=${qs}`,
    `/api/patients?q=${qs}`,
    `/api/patients?name=${qs}`,
    `/api/patients?document=${qs}`,
    // deja /search como último recurso para evitar 404 ruidosos
    `/api/patients/search?q=${qs}`,
  ]
  for (const path of candidates) {
    try {
      const res = await fetch(apiUrl(path), { headers: buildHeaders('application/json'), credentials: 'include' })
      if (!res.ok) continue
      const json = await res.json()
      const items = normalizePatients(json)
      if (items.length) return items
      // si ok pero vacío, sigue probando otras rutas
    } catch {
      // ignora y prueba la siguiente
    }
  }
  return []
}

export default function MedicalRecordsReportPage() {
  // ===== Estados y refs =====
  const [query, setQuery] = React.useState('')
  const [suggestions, setSuggestions] = React.useState<PatientLite[]>([])
  const [cache, setCache] = React.useState<PatientLite[]>([])
  const [showSug, setShowSug] = React.useState(false)
  const [selectedPatient, setSelectedPatient] = React.useState<PatientLite | null>(null)

  const [from, setFrom] = React.useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10))
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0,10))
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<ApiResponse | null>(null)

  const { user } = useAuthStore() as any;
  const watermarkLabel = React.useMemo(() => {
    const first = user?.firstName || user?.given_name || (user?.name ? String(user.name).split(' ')[0] : '');
    const last = user?.lastName || user?.family_name || (user?.name ? String(user.name).split(' ').slice(1).join(' ') : '');
    const displayName = `${first} ${last}`.trim() || user?.fullName || user?.name || '';
    const email = user?.email || user?.username || '';
    const who = displayName || email || 'Usuario';
    return `${who}`;
  }, [user]);

  const displaySelected = selectedPatient ? displayName(selectedPatient) : ''

  const wrapRef = React.useRef<HTMLDivElement | null>(null)
  const typingRef = React.useRef<number | null>(null)

  // Snapshot del cache para evitar re-ejecuciones por identidad nueva
  const cacheRef = React.useRef<PatientLite[]>([])
  React.useEffect(() => { cacheRef.current = cache }, [cache])

  // Bandera para suprimir la siguiente apertura del dropdown tras seleccionar
  const suppressNextOpenRef = React.useRef(false)
  // Control de queries para evitar resultados viejos
  const queryRef = React.useRef('')
  const reqSeqRef = React.useRef(0)

  // Cierra sugerencias al click fuera (usar pointerdown para evitar competir con onMouseDown de los ítems)
  React.useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowSug(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Prefetch básico para tener algo que filtrar localmente (mejora UX)
  React.useEffect(() => {
    let cancelled = false
    const prefetchSome = async () => {
      const candidates = [
        '/api/patients?limit=50',
        '/api/patients?pageSize=50',
        '/api/patients',
      ]
      for (const path of candidates) {
        try {
          const res = await fetch(apiUrl(path), { headers: buildHeaders('application/json'), credentials: 'include' })
          if (!res.ok) continue
          const json = await res.json()
          const items = normalizePatients(json)
          if (!cancelled && items.length) {
            setCache(items)
            break
          }
        } catch {
          // sigue con la siguiente ruta
        }
      }
    }
    prefetchSome()
    return () => { cancelled = true }
  }, [])

  // Búsqueda con debounce y filtrado local
  React.useEffect(() => {
    if (typingRef.current) window.clearTimeout(typingRef.current)
    const q = (query || '').trim()
    queryRef.current = q

    // Si acabamos de seleccionar o el texto es exactamente el nombre del seleccionado, no abrir sugerencias
    const selectedName = selectedPatient ? displayName(selectedPatient) : ''
    if (suppressNextOpenRef.current || (selectedPatient && q === selectedName)) {
      suppressNextOpenRef.current = false
      setSuggestions([])
      setShowSug(false)
      return
    }

    // Si no hay query suficiente, limpia
    if (!q || q.length < MIN_QUERY) {
      setSuggestions([])
      setShowSug(false)
      return
    }

    // 1) Filtrado local inmediato para UX
    if (cacheRef.current.length) {
      const instant = cacheRef.current.filter(p => matchesQuery(p, q)).slice(0, 50)
      setSuggestions(instant)
      setShowSug(instant.length > 0)
    }

    // 2) Búsqueda remota con debounce (y control de carreras)
    typingRef.current = window.setTimeout(async () => {
      const mySeq = ++reqSeqRef.current
      const items = await searchPatients(q).catch(() => [] as PatientLite[])
      // descarta respuestas viejas o para otra query
      if (queryRef.current !== q || mySeq !== reqSeqRef.current) return

      if (items.length) {
        const filtered = items.filter(p => matchesQuery(p, q)).slice(0, 50)
        setSuggestions(filtered)
        // refresca cache sólo si realmente cambió
        setCache(prev => {
          if (prev.length === items.length) {
            const prevIds = new Set(prev.map(x => x.id))
            if (items.every(x => prevIds.has(x.id))) return prev
          }
          return items
        })
        setShowSug(filtered.length > 0)
      } else {
        // sin resultados remotos: usa el filtro local actual
        const fallback = cacheRef.current.filter(p => matchesQuery(p, q)).slice(0, 50)
        setSuggestions(fallback)
        setShowSug(fallback.length > 0)
      }
    }, 250)
  }, [query, selectedPatient])

  // ===== Acciones =====
  const fetchJSON = async () => {
    setError(null)
    setData(null)
    const patientId = selectedPatient?.id
    if (!patientId) { setError('Seleccione un paciente'); return }
    setLoading(true)
    try {
      const url = apiUrl(`/api/reports/medical-record.json?patientId=${encodeURIComponent(patientId)}&from=${from}&to=${to}`)
      const res = await fetch(url, {
        headers: buildHeaders('application/json'),
        credentials: 'include',
      })
      if (!res.ok) {
        setError(`Error ${res.status}`)
        setLoading(false)
        return
      }
      const json = await res.json() as ApiResponse
      setData(json)
    } catch (e: any) {
      setError(e?.message ?? 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async (mode: 'full'|'summary') => {
    const patientId = selectedPatient?.id
    if (!patientId) { setError('Seleccione un paciente'); return }
    try {
      const wm = encodeURIComponent(watermarkLabel || '');
      const url = apiUrl(`/api/reports/medical-record.pdf?patientId=${encodeURIComponent(patientId)}&from=${from}&to=${to}&mode=${mode}&watermark=1&label=${wm}`);
      const res = await fetch(url, {
        headers: buildHeaders('application/pdf'),
        credentials: 'include',
      })
      if (!res.ok) { setError(`Error ${res.status}`); return }
      const blob = await res.blob()
      const dispo = res.headers.get('Content-Disposition') || ''
      const match = dispo.match(/filename="?([^\"]+)"?/)
      const filename = match?.[1] ?? `historia_${patientId}_${mode}.pdf`

      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    } catch (e: any) {
      setError(e?.message ?? 'Error descargando PDF')
    }
  }

  const pickPatient = (p: PatientLite) => {
    if (typingRef.current) window.clearTimeout(typingRef.current)
    // Evita que el efecto de búsqueda reabra el dropdown tras seleccionar
    suppressNextOpenRef.current = true
    setSelectedPatient(p)
    setCache(prev => {
      const rest = prev.filter(x => x.id !== p.id)
      return [p, ...rest]
    })
    setQuery(`${p.lastName} ${p.firstName}`.trim())
    setSuggestions([])
    setShowSug(false)
  }

  const estadoClass = (estado?: string | null) => {
    const s = String(estado ?? '').toLowerCase()
    if (s === 'completada') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (s === 'en_progreso') return 'bg-amber-50 text-amber-700 border-amber-200'
    if (s === 'borrador') return 'bg-sky-50 text-sky-700 border-sky-200'
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  const flagClass = (flag?: string | null) => {
    const f = String(flag ?? '').toLowerCase()
    if (!f || f === 'normal') return 'bg-slate-50 text-slate-700 border-slate-200'
    if (f.includes('alto') || f.includes('high') || f === 'h' || f === 'hh') return 'bg-rose-50 text-rose-700 border-rose-200'
    if (f.includes('bajo') || f.includes('low') || f === 'l' || f === 'll') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }

  const fmtDateTime = (s?: string | null) => {
    if (!s) return '—'
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return s as string
    return d.toLocaleString()
  }

  // === Pretty print para campos que pueden venir como JSON string u objeto (p.ej. Diagnóstico) ===
  const parseJsonish = (v: any) => {
    if (v == null) return null
    if (typeof v === 'object') return v
    if (typeof v === 'string') {
      try { return JSON.parse(v) } catch { return v }
    }
    return v
  }

  const camelToLabel = (s: string) =>
    s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim()

  const compactObjectPairs = (obj: Record<string, any>): string => {
    const preferred = ['impresionClinica','principal','secundarios','diferencial','cie10','codigo','code','comentarios','observaciones']
    const keys = [...preferred.filter(k => k in obj), ...Object.keys(obj).filter(k => !preferred.includes(k))]
    const parts: string[] = []
    for (const k of keys) {
      const val = (obj as any)[k]
      if (val == null || (typeof val === 'string' && val.trim() === '')) continue
      const label = k === 'cie10' ? 'CIE-10' : camelToLabel(k)
      const printable = Array.isArray(val) ? val.filter(x => x != null && String(x).trim() !== '').join(', ') : String(val)
      if (!printable) continue
      parts.push(`${label}: ${printable}`)
      if (parts.length >= 6) break
    }
    const text = parts.join(' • ')
    return text.length > 160 ? text.slice(0,157) + '…' : text
  }

  const renderDiagCell = (raw: any, fallback?: string | null) => {
    const parsed = parseJsonish(raw)
    if (parsed && typeof parsed === 'object') return compactObjectPairs(parsed as Record<string, any>)
    if (parsed == null || parsed === '') return fallback ?? ''
    return String(parsed)
  }

  // === Helpers para agrupar laboratorios por categoría y pintar cabeceras de grupo ===
  const normCat = (s?: string | null) =>
    (s ?? '')
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim() || 'General';

  const renderLabTable = (items: ApiLabValue[], keyPrefix: string, emptyMsg: string) => {
    const rows: React.ReactNode[] = [];
    let currentCat: string | null = null;

    items.forEach((v, idx) => {
      const cat = normCat(v.categoria);
      if (cat !== currentCat) {
        currentCat = cat;
        rows.push(
          <tr key={`${keyPrefix}-cat-${idx}`} className="bg-slate-50">
            <td className="px-3 py-2 font-medium text-slate-700" colSpan={6}>
              Categoría: {cat}
            </td>
          </tr>
        );
      }
      rows.push(
        <tr key={`${keyPrefix}-row-${idx}`} className="border-t border-slate-200">
          <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(v.fecha)}</td>
          <td className="px-3 py-2">{v.prueba}</td>
          <td className="px-3 py-2">{v.valor}</td>
          <td className="px-3 py-2">{v.unidad}</td>
          <td className="px-3 py-2">{v.rango}</td>
          <td className="px-3 py-2">
            <span className={`px-2 py-0.5 rounded-full border text-xs ${flagClass(v.flag)}`}>
              {v.flag || '—'}
            </span>
          </td>
        </tr>
      );
    });

    return (
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="text-left px-3 py-2">Fecha</th>
            <th className="text-left px-3 py-2">Prueba</th>
            <th className="text-left px-3 py-2">Valor</th>
            <th className="text-left px-3 py-2">Unidad</th>
            <th className="text-left px-3 py-2">Rango</th>
            <th className="text-left px-3 py-2">Bandera</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows : (
            <tr>
              <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                {emptyMsg}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const labValuesAll = React.useMemo<ApiLabValue[]>(() => {
    const fromFlat = data?.labValues ?? []
    if (fromFlat.length) return fromFlat
    // Fallback: aplanar desde labResults si el backend aún no expone labValues
    const rows: ApiLabValue[] = []
    if (data?.labResults?.length) {
      for (const lr of data.labResults) {
        const fecha = lr?.fecha as any
        for (const v of (lr.values || [])) {
          rows.push({
            fecha: typeof fecha === 'string' ? fecha : String(fecha ?? ''),
            prueba: v.prueba,
            valor: v.valor,
            unidad: v.unidad ?? '',
            rango: v.rango ?? '',
            flag: v.flag ?? '',
            categoria: v.categoria ?? '',
            source: lr.source,
          })
        }
      }
    }
    return rows
  }, [data])


  // ===== Render =====
  return (
    <div className="space-y-6">
      <Card variant="medical" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Buscador de paciente */}
          <div className="md:col-span-2" ref={wrapRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Paciente</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-slate-400" />
              </div>
              <input
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                placeholder="Ej: Pérez Juan / 12345678"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedPatient(null) }}
                onFocus={() => {
                  const q = (query || '').trim()
                  if (selectedPatient && q === displaySelected) return
                  if (q.length >= MIN_QUERY) {
                    let instant: PatientLite[] = []
                    if (cacheRef.current.length) {
                      instant = cacheRef.current.filter(p => matchesQuery(p, q)).slice(0, 50)
                      setSuggestions(instant)
                    } else {
                      setSuggestions([])
                    }
                    setShowSug(instant.length > 0)
                  }
                }}
                autoComplete="off"
              />

              {showSug && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg ring-1 ring-black/5 max-h-64 overflow-auto">
                  {suggestions.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); pickPatient(p) }}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center gap-2"
                    >
                      <div className="h-7 w-7 rounded-full bg-indigo-50 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-indigo-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-900">{p.lastName} {p.firstName}</div>
                        <div className="text-xs text-slate-500">
                          {(p.documentType ?? '')} {(p.documentNumber ?? '')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rango de fechas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
              value={from}
              onChange={e => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJSON}
              className="border-sky-200 text-sky-700 hover:bg-sky-50"
              title="Consultar historia clínica"
              disabled={loading}
            >
              <SearchIcon className="h-4 w-4" />
              {loading ? 'Cargando…' : 'Consultar'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPDF('full')}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              title="Descargar PDF completo"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Errores */}
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {/* Resultados */}
      {data && (
        <div className="space-y-6">
          {/* Encabezado del paciente */}
          <Card variant="medical" className="p-4">
            <div className="font-medium text-slate-900">
              {data.patient.lastName} {data.patient.firstName}
            </div>
            <div className="mt-1">
              {(data.patient.documentType || data.patient.documentNumber) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                  <IdCard className="h-3 w-3" />
                  <span className="capitalize">{data.patient.documentType ?? ''}</span>
                  <span className="text-slate-400">•</span>
                  <span>{data.patient.documentNumber ?? ''}</span>
                </span>
              )}
            </div>
          </Card>

          {/* Tabla simple de consultas (subset de campos) */}
          <Card variant="default" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2">Fecha</th>
                    <th className="text-left px-3 py-2">Médico</th>
                    <th className="text-left px-3 py-2">Motivo</th>
                    <th className="text-left px-3 py-2">Diagnóstico</th>
                    <th className="text-left px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.consultations.map((c) => (
                    <tr key={c.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">{new Date(c.fecha).toLocaleString()}</td>
                      <td className="px-3 py-2">{c.medico ?? ''}</td>
                      <td className="px-3 py-2">{c.motivo ?? ''}</td>
                      <td className="px-3 py-2">{renderDiagCell(c.diagnostico, c.resumen)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full border text-xs ${estadoClass(c.estado)}`}>
                          {c.estado ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.consultations.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                        Sin consultas en el rango seleccionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>


          {/* Laboratorio: todos los valores */}
          <Card variant="default" className="overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-700">
              Resultados de laboratorio — todos ({labValuesAll.length})
            </div>
            <div className="overflow-x-auto">
              {renderLabTable(
                labValuesAll,
                'all',
                'Sin resultados de laboratorio en el rango seleccionado'
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}