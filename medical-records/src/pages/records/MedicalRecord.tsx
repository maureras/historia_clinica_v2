// src/pages/records/MedicalRecord.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, FileText, Stethoscope, Activity, User, Droplet, Plus } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { usePatientsStore, useAuthStore } from '@/stores'
import api from '@/lib/api'

type EstadoConsulta = 'borrador' | 'completada'

interface SignosVitales {
  temperatura?: string
  presion?: string
  fc?: string
  fr?: string
  spo2?: string
}

interface ConsultaItem {
  id: string
  fecha: string // ISO
  medico?: string
  estado?: EstadoConsulta
  motivo?: string
  resumen?: string
  signosVitales?: SignosVitales
}

interface LabValue {
  id: string
  prueba: string
  valor: string
  unidad?: string | null
  rango?: string | null
  flag?: string | null
  categoria?: string | null
}

interface LabResult {
  id: string
  resumen?: string | null
  fechaInforme?: string | null
  values: LabValue[]
}

type LabsByConsult = Record<string, LabResult[]>

export default function MedicalRecord() {
  const navigate = useNavigate()
  const { patientId } = useParams()
  const pid = String(patientId ?? '')
  const { patients, fetchPatients } = usePatientsStore()

  // === Auth: normalizar roles y evitar objetos en selectores ===
  const isAuthenticated = useAuthStore((s: any) => !!s.isAuthenticated)

  const roleKey = useAuthStore((s: any) => {
    const u = (s as any).user ?? {}
    const names: string[] = []

    const pushName = (val: any) => {
      if (!val) return
      names.push(String(val))
    }

    // soporta user.rol | user.role | user.perfil
    pushName((u as any).rol)
    pushName((u as any).role)
    pushName((u as any).perfil)

    // soporta user.roles: string[] o { name|nombre }[]
    if (Array.isArray((u as any).roles)) {
      for (const r of (u as any).roles) {
        if (typeof r === 'string') pushName(r)
        else if (r && ((r as any).name || (r as any).nombre)) pushName((r as any).name || (r as any).nombre)
      }
    }

    // opcional: mapeo por id si existe
    if (typeof (u as any).roleId === 'number') {
      const mapById: Record<number, string> = {
        1: 'ADMIN',
        2: 'MEDICO',
        3: 'DOCTOR',
      }
      if (mapById[(u as any).roleId]) pushName(mapById[(u as any).roleId])
    }

    // devolvemos string estable para suscripción
    return names
      .map(n => n.trim().toUpperCase())
      .filter(Boolean)
      .sort()
      .join('|')
  })

  const canCreateConsult = useMemo(() => {
    if (!isAuthenticated) return false
    const tokens = roleKey ? roleKey.split('|') : []
    const allowed = new Set(['ADMIN', 'MEDICO', 'DOCTOR'])
    return tokens.some(t => allowed.has(t))
  }, [isAuthenticated, roleKey])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [consultas, setConsultas] = useState<ConsultaItem[]>([])
  const [labsByConsult, setLabsByConsult] = useState<LabsByConsult>({})

  // Asegura tener pacientes para el encabezado
  useEffect(() => {
    if (!patients || patients.length === 0) {
      fetchPatients()
    }
  }, [patients, fetchPatients])

  const paciente = useMemo(
    () => patients?.find(p => String(p.id) === pid),
    [patients, pid]
  )

  // Normalizador por si signosVitales llega como string JSON
  const normalizeConsulta = (raw: any): ConsultaItem => {
    const sv: SignosVitales | undefined =
      typeof raw?.signosVitales === 'string'
        ? safeParse<SignosVitales>(raw.signosVitales)
        : (raw?.signosVitales as SignosVitales | undefined)

    return {
      id: String(raw.id),
      fecha: String(raw.fecha), // el backend guarda Date, Prisma lo serializa a ISO
      medico: raw.medico ?? undefined,
      estado: (raw.estado as EstadoConsulta) ?? undefined,
      motivo: raw.motivo ?? undefined,
      resumen: raw.resumen ?? undefined,
      signosVitales: sv,
    }
  }

  // Carga de consultas (UN solo efecto)
  useEffect(() => {
    let cancel = false
    const run = async () => {
      // Si no hay patientId en la URL, no intentes pedir al backend
      if (!pid) {
        if (!cancel) {
          setConsultas([])
          setError('Paciente no especificado')
          setLoading(false)
        }
        return
      }

      setLoading(true)
      try {
        // ✅ Siempre contra el backend real
        const { data } = await api.get<unknown[]>('/api/consultations', { params: { patientId: pid } })
        if (cancel) return

        const arr = Array.isArray(data) ? data.map(normalizeConsulta) : []
        // Orden DESC por fecha
        arr.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        setConsultas(arr)
        setError(null)
      } catch (e: any) {
        if (cancel) return
        // Muestra el mensaje real del backend si viene, si no un genérico
        const msg = e?.response?.data?.message || e?.message || 'Error al cargar consultas'
        setError(msg)
        setConsultas([])
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    run()
    return () => { cancel = true }
  }, [pid])

  useEffect(() => {
    let cancel = false
    const loadLabs = async () => {
      try {
        const pairs: Array<[string, LabResult[]]> = await Promise.all(
          consultas.map(async (c): Promise<[string, LabResult[]]> => {
            try {
              const { data } = await api.get<LabResult[]>('/api/labs/by-consultation', {
                params: { consultationId: c.id }
              })
              return [c.id, Array.isArray(data) ? (data as LabResult[]) : ([] as LabResult[])]
            } catch {
              return [c.id, [] as LabResult[]]
            }
          })
        )
        if (cancel) return
        const map: LabsByConsult = {}
        for (const [cid, arr] of pairs) map[cid] = arr
        setLabsByConsult(map)
      } catch {
        if (!cancel) setLabsByConsult({})
      }
    }
    if (consultas.length > 0) loadLabs()
    else setLabsByConsult({})
    return () => { cancel = true }
  }, [consultas])

  return (
    <div className="space-y-6">
      {/* Header paciente */}
      <Card className="p-6 bg-white border border-slate-200 rounded-xl shadow relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Historia Clínica</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                {paciente ? (
                  <>
                    <span className="font-medium">
                      {paciente.firstName} {paciente.lastName}
                    </span>
                    {paciente.documentNumber ? <span className="text-slate-400">•</span> : null}
                    {paciente.documentNumber ? <span>{paciente.documentNumber}</span> : null}
                    {paciente.bloodType ? <span className="text-slate-400">•</span> : null}
                    {paciente.bloodType ? (
                      <span className="px-2 py-0.5 rounded-full border text-xs bg-cyan-50 text-cyan-700 border-cyan-200 inline-flex items-center gap-1">
                        <Droplet className="h-3 w-3" /> {paciente.bloodType}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-slate-500">Paciente: {pid}</span>
                )}
              </span>
            </div>
          </div>
          {/* (Opcional) Botón global cuando sí hay permisos */}
          {pid && canCreateConsult && (
            <div className="hidden md:block">
              <Button
                variant="primary"
                onClick={() => navigate(`/consultations/new/${pid}`)}
                className="inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nueva consultas
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Estados de carga / error */}
      {loading && <Card className="p-6 text-slate-600">Cargando consultas…</Card>}
      {error && <Card className="p-6 text-red-700 border-red-200 bg-red-50">{error}</Card>}

      {/* Timeline */}
      {!loading && consultas.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <Stethoscope className="h-10 w-10 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600">Aún no hay consultas registradas para este paciente.</p>
          {pid && canCreateConsult && (
            <Button
              variant="primary"
              onClick={() => navigate(`/consultations/new/${pid}`)}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva consulta
            </Button>
          )}
          {pid && !canCreateConsult && (
            <p className="text-xs text-slate-500">No tienes permisos para crear nuevas consultas.</p>
          )}
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-4 md:left-6 top-0 bottom-0 w-px bg-slate-200" />
          <ul className="space-y-6">
            {consultas.map((c) => (
              <li key={c.id} className="relative">
                {/* Punto en la línea */}
                <div
                  className={`absolute -left-[3px] md:-left-[5px] top-3 h-2 w-2 rounded-full border-2 border-white shadow ${
                    c.estado === 'completada' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <Card className="p-4 md:ml-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden hover:shadow transition">
                  <div
                    className={`absolute left-0 top-0 h-full w-1 ${
                      c.estado === 'completada' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Calendar className={`h-4 w-4 ${c.estado === 'completada' ? 'text-emerald-600' : 'text-amber-600'}`} />
                      <span className="font-medium text-slate-900">
                        {new Date(c.fecha).toLocaleDateString('es-EC', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                      {c.estado ? (
                        <span
                          className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
                            c.estado === 'completada'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {c.estado === 'completada' ? 'Completada' : 'Borrador'}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center gap-2">
                      <Stethoscope className={`h-4 w-4 ${c.estado === 'completada' ? 'text-emerald-600' : 'text-amber-600'}`} />{' '}
                      {c.medico || '—'}
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 flex items-center gap-1">
                        <FileText className="h-3 w-3 text-indigo-600" /> Motivo
                      </div>
                      <div className="text-sm text-slate-800">{c.motivo || '—'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-purple-600 flex items-center gap-1">
                        <Stethoscope className="h-3 w-3 text-purple-600" /> Resumen
                      </div>
                      <div className="text-sm text-slate-800">{c.resumen || '—'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-rose-600 flex items-center gap-1">
                        <Activity className="h-3 w-3 text-rose-600" /> Signos vitales
                      </div>
                      <div className="text-sm text-slate-800">
                        {c.signosVitales ? (
                          <span className="inline-flex flex-wrap gap-2">
                            {c.signosVitales.presion && (
                              <span className="inline-flex items-center gap-1">
                                <Activity className="h-3 w-3" /> {c.signosVitales.presion}
                              </span>
                            )}
                            {c.signosVitales.fc && <span>FC {c.signosVitales.fc}</span>}
                            {c.signosVitales.fr && <span>FR {c.signosVitales.fr}</span>}
                            {c.signosVitales.temperatura && <span>T° {c.signosVitales.temperatura}</span>}
                            {c.signosVitales.spo2 && <span>SpO₂ {c.signosVitales.spo2}</span>}
                          </span>
                        ) : (
                          '—'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Laboratorios asociados */}
                  {(labsByConsult[c.id]?.length ?? 0) > 0 && (
                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <div className="text-sm font-semibold text-slate-900 mb-2">Resultados de laboratorio</div>

                      {labsByConsult[c.id]!.map((lr) => (
                        <div key={lr.id} className="mb-3">
                          {lr.fechaInforme && (
                            <div className="text-xs text-slate-500 mb-1">
                              Informe: {new Date(lr.fechaInforme).toLocaleDateString('es-EC')}
                            </div>
                          )}
                          {lr.resumen && (
                            <div className="text-sm text-slate-800 mb-2">
                              {lr.resumen}
                            </div>
                          )}

                          {lr.values?.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600">Prueba</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600">Valor</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600">Unidad</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600">Rango</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600">Bandera</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {lr.values.slice(0, 3).map((v) => (
                                    <tr key={v.id}>
                                      <td className="px-3 py-2 text-slate-800">{v.prueba}</td>
                                      <td className="px-3 py-2 text-slate-800">{v.valor}</td>
                                      <td className="px-3 py-2 text-slate-600">{v.unidad ?? '—'}</td>
                                      <td className="px-3 py-2 text-slate-600">{v.rango ?? '—'}</td>
                                      <td className="px-3 py-2">
                                        {v.flag ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                            {v.flag}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                            Normal
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {lr.values.length > 3 && (
                                <div className="mt-1 text-xs text-slate-500">
                                  +{lr.values.length - 3} más
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(`/consultations/view/${c.id}`, {
                          state: { fromPatientId: pid }
                        })
                      }
                    >
                      <FileText className="h-4 w-4" /> Ver detalle
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Utilidad segura para parsear JSON
function safeParse<T = unknown>(s: string): T | undefined {
  try {
    return JSON.parse(s) as T
  } catch {
    return undefined
  }
}