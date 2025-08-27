import React, { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Stethoscope,
  Activity,
  FileText,
  Pill,
  User,
  Droplet,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Brain
} from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { usePatientsStore, useAuthStore } from '@/stores'

type EstadoConsulta = 'borrador' | 'completada'

// Interfaz para valores de laboratorio
interface LabValueProcessed {
  parameter: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  category?: string;
}

// Interfaz para resultados de laboratorio procesados
interface ProcessedLabResult {
  fileName: string;
  extractedText: string;
  parsedValues: LabValueProcessed[];
  summary: string;
  processingDate: Date;
  confidence: number;
  documentId?: string;
  fileUrl?: string;
}

// Helpers para abnormalidad
function parseNum(n: unknown): number | null {
  if (n == null) return null
  const s = String(n).replace(',', '.').match(/-?\d+(\.\d+)?/)
  return s ? parseFloat(s[0]) : null
}
function fallbackIsAbnormal(value: unknown, range?: unknown): boolean {
  if (!range) return false
  const v = parseNum(value)
  if (v == null || isNaN(v)) return false
  const r = String(range)
  const between = r.match(/(-?\d+(?:[.,]\d+)?)\s*[-–]\s*(-?\d+(?:[.,]\d+)?)/)
  if (between) {
    const low = parseFloat(between[1].replace(',', '.'))
    const high = parseFloat(between[2].replace(',', '.'))
    return v < low || v > high
  }
  const less = r.match(/<\s*(-?\d+(?:[.,]\d+)?)/)
  if (less) {
    const max = parseFloat(less[1].replace(',', '.'))
    return v >= max
  }
  const greater = r.match(/>\s*(-?\d+(?:[.,]\d+)?)/)
  if (greater) {
    const min = parseFloat(greater[1].replace(',', '.'))
    return v <= min
  }
  return false
}

// Mapea el formato del backend al formato de UI
function mapApiLabToProcessed(lr: any): ProcessedLabResult {
  const values = Array.isArray(lr?.values) ? lr.values : []
  const parsedValues: LabValueProcessed[] = values.map((v: any) => {
    const unit = v?.unidad ?? undefined
    const referenceRange = v?.rango ?? undefined
    const hasFlag = v?.flag != null && String(v.flag).trim() !== ''
    const fromFlag = hasFlag ? String(v.flag).toLowerCase() !== 'normal' : false
    const inferred = !hasFlag ? fallbackIsAbnormal(v?.valor, referenceRange) : false
    return {
      parameter: String(v?.prueba ?? ''),
      value: (v?.valor ?? '') as string,
      unit,
      referenceRange,
      isAbnormal: fromFlag || inferred,
      category: v?.categoria ? String(v.categoria) : undefined,
    }
  })
  let summary = ''
  const rh = lr?.resumen_hallazgos ? String(lr.resumen_hallazgos) : ''
  const rs = lr?.resumen ? String(lr.resumen) : ''
  if (rh && rs) summary = `Hallazgos: ${rh}\n\nResumen: ${rs}`
  else summary = rh || rs || ''
  let fileUrl: string | undefined = undefined
  if (lr?.id) {
    fileUrl = `/api/labs/${lr.id}/pdf?watermark=1&label=${encodeURIComponent('Historia Clínica')}`
  }
  const documentId: string | undefined = lr?.id ? String(lr.id) : undefined;
  return {
    fileName: lr?.document?.filename ?? (lr?.source ? `(${lr.source})` : '(sin archivo)'),
    extractedText: '',
    parsedValues,
    summary,
    processingDate: new Date(lr?.fechaInforme ?? lr?.createdAt ?? Date.now()),
    confidence: 0.9,
    documentId,
    fileUrl,
  }
}

interface ConsultaDetalle {
  id: string
  fecha: string
  estado?: EstadoConsulta
  medico?: string
  motivo?: string
  resumen?: string
  exploracion?: string | Record<string, any>
  indicaciones?: string | Record<string, any>
  adjuntos?: Array<{ id: string; nombre: string; url?: string }>
  signosVitales?: {
    temperatura?: string
    presion?: string
    fc?: string
    fr?: string
    spo2?: string
  }
  patientId?: string
  laboratorios?: {
    archivos: Array<{ id: string; nombre: string; url?: string }>;
    resultadosProcesados: ProcessedLabResult[];
    analisisGeneral?: string;
    fechaProcesamiento?: string;
  }
}

// Componente para mostrar una sección de laboratorio
const LabSection: React.FC<{ labResult: ProcessedLabResult; onOpenPdf?: (documentId: string) => void }> = ({ labResult, onOpenPdf }) => {
  const abnormalCount = labResult.parsedValues.filter(v => v.isAbnormal).length;
  const normalCount = labResult.parsedValues.length - abnormalCount;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
      {/* Header del resultado */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <TestTube className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">{labResult.fileName}</h4>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>Procesado: {new Date(labResult.processingDate as any).toLocaleDateString()}</span>
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    labResult.confidence > 0.8 ? 'bg-green-500' :
                    labResult.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  Confianza: {(labResult.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-700">{normalCount} normales</span>
            </div>
            {abnormalCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-red-700">{abnormalCount} alterados</span>
              </div>
            )}
            {labResult.documentId && onOpenPdf && (
              <button
                onClick={() => onOpenPdf(labResult.documentId!)}
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                title="Abrir informe con marca de agua"
                type="button"
              >
                <FileText className="w-4 h-4 mr-1" />
                Ver PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resumen */}
      {labResult.summary && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-slate-600 mt-0.5" />
            <div>
              <h5 className="font-medium text-slate-900 mb-2">Resumen de IA</h5>
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                {labResult.summary}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Valores detallados */}
      <div className="p-6">
        {labResult.parsedValues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {labResult.parsedValues.map((value, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                value.isAbnormal
                  ? 'border-red-200 bg-red-50'
                  : 'border-green-200 bg-green-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900 text-sm">{value.parameter}</span>
                  {value.isAbnormal ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Valor:</span>
                    <span className={`font-semibold text-sm ${
                      value.isAbnormal ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {value.value}{' '}
                      <span className="text-xs text-slate-600">{value.unit ? String(value.unit) : '—'}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Rango:</span>
                    <span className="text-xs text-slate-700">{value.referenceRange ? String(value.referenceRange) : '—'}</span>
                  </div>
                  {value.category && (
                    <div className="pt-2">
                      <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                        {value.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <TestTube className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p>No se pudieron extraer valores de laboratorio de este archivo</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Normaliza campos que pueden venir como string o como objeto
function normalizeTextish(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const v = value as Record<string, any>
    const knownOrder = [ 'exploracionGeneral', 'exploracionSistemas', 'hallazgosEspecificos', 'observacionesGenerales', 'indicaciones', 'plan', 'medicacion', 'fechaExploracion', 'exploradoPor' ]
    const parts: string[] = []
    for (const key of knownOrder) {
      if (v[key] != null && v[key] !== '') {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
        parts.push(`${label}: ${typeof v[key] === 'object' ? JSON.stringify(v[key], null, 2) : String(v[key])}`)
      }
    }
    for (const k of Object.keys(v)) {
      if (!knownOrder.includes(k) && v[k] != null && v[k] !== '') {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
        parts.push(`${label}: ${typeof v[k] === 'object' ? JSON.stringify(v[k], null, 2) : String(v[k])}`)
      }
    }
    return parts.join('\n') || JSON.stringify(v, null, 2)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function renderExploracion(value: unknown): React.ReactNode {
  const prettyKey = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim()
  const isEmpty = (v: unknown) => {
    if (v == null) return true
    if (typeof v === 'string') return v.trim() === ''
    if (Array.isArray(v)) return v.length === 0
    if (typeof v === 'object') return Object.keys(v as Record<string, unknown>).length === 0
    return false
  }

  if (value == null) return <span>—</span>
  if (typeof value === 'string') {
    const s = value.trim()
    return <div className="text-sm text-slate-800 whitespace-pre-wrap">{s || '—'}</div>
  }

  if (typeof value === 'object') {
    const v = value as Record<string, any>
    const sections: React.ReactNode[] = []

    if (v.exploracionGeneral && typeof v.exploracionGeneral === 'object' && !isEmpty(v.exploracionGeneral)) {
      sections.push(
        <div key="exploracionGeneral" className="mb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Exploración general</div>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-800">
            {Object.entries(v.exploracionGeneral).filter(([, val]) => !isEmpty(val)).map(([k, val]) => (
                <li key={k}><span className="text-slate-600">{prettyKey(k)}:</span>{' '}<span>{Array.isArray(val) ? val.join(', ') : String(val)}</span></li>
            ))}
          </ul>
        </div>
      )
    }
    if (v.exploracionSistemas && typeof v.exploracionSistemas === 'object' && !isEmpty(v.exploracionSistemas)) {
      sections.push(
        <div key="exploracionSistemas" className="mb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Exploración por sistemas</div>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-800">
            {Object.entries(v.exploracionSistemas).filter(([, val]) => !isEmpty(val)).map(([k, val]) => (
                <li key={k}><span className="text-slate-600">{prettyKey(k)}:</span>{' '}<span>{Array.isArray(val) ? val.join(', ') : String(val)}</span></li>
            ))}
          </ul>
        </div>
      )
    }
    if (v.hallazgosEspecificos && typeof v.hallazgosEspecificos === 'object' && !isEmpty(v.hallazgosEspecificos)) {
      const h = v.hallazgosEspecificos
      sections.push(
        <div key="hallazgosEspecificos" className="mb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Hallazgos específicos</div>
          <div className="space-y-1 text-sm text-slate-800">
            {!isEmpty(h.hallazgosNormales) && (<div><span className="text-slate-600">Hallazgos normales:</span>{' '}<span>{Array.isArray(h.hallazgosNormales) ? (h.hallazgosNormales.length ? h.hallazgosNormales.join(', ') : '—') : String(h.hallazgosNormales)}</span></div>)}
            {!isEmpty(h.hallazgosAnormales) && (<div><span className="text-slate-600">Hallazgos anormales:</span>{' '}<span>{Array.isArray(h.hallazgosAnormales) ? (h.hallazgosAnormales.length ? h.hallazgosAnormales.join(', ') : '—') : String(h.hallazgosAnormales)}</span></div>)}
            {!isEmpty(h.impresionClinica) && (<div><span className="text-slate-600">Impresión clínica:</span>{' '}<span className="whitespace-pre-wrap">{String(h.impresionClinica)}</span></div>)}
          </div>
        </div>
      )
    }
    if (!isEmpty(v.observacionesGenerales)) {
      sections.push(
        <div key="observacionesGenerales" className="mb-1">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Observaciones generales</div>
          <div className="text-sm text-slate-800 whitespace-pre-wrap">{String(v.observacionesGenerales)}</div>
        </div>
      )
    }
    if (sections.length > 0) {
      return <div>{sections}</div>
    }
    return <pre className="text-sm text-slate-800 whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>
  }

  try {
    return <pre className="text-sm text-slate-800 whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
  } catch {
    return <span>{String(value)}</span>
  }
}

export default function ConsultationDetail() {
  const { consultationId } = useParams()
  const navigate = useNavigate()
  
  const { user } = useAuthStore() as any;

  const watermarkLabel = useMemo(() => {
    const first = user?.firstName || user?.given_name || (user?.name ? String(user.name).split(' ')[0] : '');
    const last = user?.lastName || user?.family_name || (user?.name ? String(user.name).split(' ').slice(1).join(' ') : '');
    const displayName = `${first} ${last}`.trim() || user?.fullName || user?.name || '';
    const email = user?.email || user?.username || '';
    const who = displayName || email || 'Usuario';
    return `${who}`;
  }, [user]);

  const { patients, fetchPatients } = usePatientsStore()
  useEffect(() => {
    if (!patients || patients.length === 0) fetchPatients()
  }, [patients, fetchPatients])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [consulta, setConsulta] = useState<ConsultaDetalle | null>(null)

  const paciente = useMemo(() => {
    if (!consulta?.patientId) return null
    return patients?.find(p => p.id === consulta.patientId) || null
  }, [patients, consulta?.patientId])

  const cargarConsulta = async () => {
    if (!consultationId) {
      setError('ID de consulta no proporcionado')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const [consultationResp, labsResp] = await Promise.all([
        api.get<ConsultaDetalle>(`/api/consultations/${consultationId}`),
        api.get<any[]>(`/api/labs/by-consultation`, { params: { consultationId } })
      ])
      const data = consultationResp.data
      const parsed: ConsultaDetalle = {
        ...data,
        signosVitales: typeof (data as any)?.signosVitales === 'string' ? (safeParse((data as any).signosVitales) as any) : (data as any)?.signosVitales,
        laboratorios: typeof (data as any)?.laboratorios === 'string' ? safeParse((data as any).laboratorios) as any : (data as any)?.laboratorios,
        exploracion: (data as any)?.exploracion ?? (data as any)?.exploracionFisica ?? undefined,
        indicaciones: (data as any)?.indicaciones ?? (data as any)?.tratamiento ?? undefined,
      }
      const apiLabs = Array.isArray(labsResp?.data) ? labsResp.data : []
      const resultadosProcesados: ProcessedLabResult[] = apiLabs.map(mapApiLabToProcessed)
      resultadosProcesados.sort((a, b) => new Date(b.processingDate as any).getTime() - new Date(a.processingDate as any).getTime())
      const archivos = apiLabs
        .filter((lr: any) => lr?.document)
        .map((lr: any) => {
          const id = String(lr.id)
          const wm = encodeURIComponent(watermarkLabel)
          return {
            id,
            nombre: String(lr.document.filename),
            url: `/api/labs/${id}/pdf?watermark=1&label=${wm}`,
          }
        })

      parsed.laboratorios = {
        archivos,
        resultadosProcesados,
        analisisGeneral: parsed.laboratorios?.analisisGeneral ?? '',
        fechaProcesamiento: parsed.laboratorios?.fechaProcesamiento ?? undefined,
      }
      setConsulta(parsed)
    } catch (e: any) {
      console.warn('Error al cargar detalle de consulta:', e?.message || e)
      setError(e?.response?.data?.message || e?.message || 'Error al cargar consulta')
      setConsulta(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarConsulta();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId, watermarkLabel]);

  const labStats = useMemo(() => {
    if (!consulta?.laboratorios?.resultadosProcesados) return null;
    const allValues = consulta.laboratorios.resultadosProcesados.flatMap(r => r.parsedValues);
    const abnormalValues = allValues.filter(v => v.isAbnormal);
    return {
      totalValues: allValues.length,
      abnormalValues: abnormalValues.length,
      normalValues: allValues.length - abnormalValues.length,
      percentageAbnormal: allValues.length > 0 ? (abnormalValues.length / allValues.length * 100).toFixed(0) : '0'
    };
  }, [consulta?.laboratorios]);

  // Función corregida para abrir PDF en una nueva pestaña sin descargar
  const openPdfInTab = async (documentId: string, watermarkText: string) => {
    // La URL debe apuntar al endpoint que entrega el archivo PDF.
    // Aquí se asume que todos los documentos (labs y adjuntos) se obtienen de una ruta similar.
    // Si los adjuntos usan una URL diferente, se necesitaría lógica adicional.
    const url = `/api/labs/${documentId}/pdf?watermark=1&label=${encodeURIComponent(watermarkText || '')}`;

    const pdfTab = window.open('', '_blank');
    if (!pdfTab) {
      alert('No se pudo abrir una nueva pestaña. Por favor, deshabilita tu bloqueador de pop-ups.');
      return;
    }
    pdfTab.document.write('Cargando PDF...');

    try {
      const response = await api.get(url, { responseType: 'blob' });

      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('application/pdf')) {
        pdfTab.document.write('Error: El archivo recibido del servidor no es un PDF.');
        setTimeout(() => pdfTab.close(), 3000);
        return;
      }

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(pdfBlob);
      pdfTab.location.href = objectUrl;

      pdfTab.addEventListener('beforeunload', () => {
        URL.revokeObjectURL(objectUrl);
      });

    } catch (error) {
      console.error('Error al cargar el PDF:', error);
      if (pdfTab && !pdfTab.closed) {
        pdfTab.document.write('Error al cargar el PDF. Revisa la consola para más detalles.');
      }
      alert('No se pudo cargar el PDF. Es posible que tu sesión haya expirado o haya un problema de red.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <Card className={`p-6 rounded-xl shadow border ${ consulta?.estado === 'completada' ? '!border-emerald-300' : '!border-amber-300' }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Detalle de consulta</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <span className="inline-flex items-center gap-2"><Calendar className={`h-4 w-4 ${consulta?.estado === 'completada' ? 'text-emerald-600' : 'text-amber-600'}`} />{consulta ? new Date(consulta.fecha).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
              {consulta?.estado && (<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${ consulta.estado === 'completada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200' }`}>{consulta.estado === 'completada' ? 'Completada' : 'Borrador'}</span>)}
              <span className="inline-flex items-center gap-2"><Stethoscope className={`h-4 w-4 ${consulta?.estado === 'completada' ? 'text-emerald-600' : 'text-amber-600'}`} />{consulta?.medico || '—'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <span className="inline-flex items-center gap-2"><User className="h-4 w-4 text-slate-500" />
                {paciente ? (
                  <><span className="font-medium">{paciente.firstName} {paciente.lastName}</span>
                    {paciente.documentNumber ? <span className="text-slate-400">•</span> : null}
                    {paciente.documentNumber ? <span>{paciente.documentNumber}</span> : null}
                    {paciente.bloodType ? <span className="text-slate-400">•</span> : null}
                    {paciente.bloodType ? (<span className="px-2 py-0.5 rounded-full border text-xs bg-cyan-50 text-cyan-700 border-cyan-200 inline-flex items-center gap-1"><Droplet className="h-3 w-3" /> {paciente.bloodType}</span>) : null}
                  </>
                ) : (<span className="text-slate-500">Paciente: {consulta?.patientId || '—'}</span>)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2"><Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Volver</Button></div>
        </div>
      </Card>

      {/* Estados */}
      {loading && <Card className="p-6 text-slate-600">Cargando detalle…</Card>}
      {error && (<Card className="p-6 text-red-700 border-red-200 bg-red-50">{error}</Card>)}

      {/* Contenido */}
      {!loading && consulta && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 border-2 border-indigo-300 rounded-xl shadow">
              <div className="flex items-center gap-2 mb-3"><ClipboardList className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-semibold text-indigo-700">Motivo y resumen</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Motivo</div><div className="text-sm text-slate-800">{consulta.motivo || '—'}</div></div>
                <div><div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Resumen / diagnóstico</div><div className="text-sm text-slate-800 whitespace-pre-wrap">{consulta.resumen || '—'}</div></div>
              </div>
            </Card>

            {consulta.laboratorios && (
              <Card className="p-6 border-2 border-emerald-300 rounded-xl shadow">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2"><TestTube className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-semibold text-emerald-700">Resultados de Laboratorio</h2></div>
                  {labStats && (<div className="flex items-center gap-4 text-sm"><div className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-green-700">{labStats.normalValues}</span></div><div className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-red-700">{labStats.abnormalValues}</span></div><span className="text-slate-600">({labStats.percentageAbnormal}% alterados)</span></div>)}
                </div>
                {consulta.laboratorios.analisisGeneral && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start gap-3"><Brain className="w-5 h-5 text-slate-600 mt-0.5" />
                      <div><h4 className="font-medium text-slate-900 mb-2">Análisis General de IA</h4><p className="text-sm text-slate-700 whitespace-pre-wrap">{consulta.laboratorios.analisisGeneral}</p></div>
                    </div>
                  </div>
                )}
                {(consulta.laboratorios?.resultadosProcesados ?? []).length > 0 ? (
                  <div className="space-y-4">
                    {(consulta.laboratorios?.resultadosProcesados ?? []).map((labResult, index) => (<LabSection key={index} labResult={labResult} onOpenPdf={(docId) => openPdfInTab(docId, watermarkLabel)} />))}
                  </div>
                ) : (<div className="text-sm text-slate-600">No hay resultados de laboratorio procesados.</div>)}
                {(consulta.laboratorios?.archivos ?? []).length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Archivos de Laboratorio</h4>
                    <ul className="space-y-1">
                      {(consulta.laboratorios?.archivos ?? []).map(archivo => (
                        <li key={archivo.id} className="flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-blue-600" />
                          <button type="button" onClick={() => openPdfInTab(archivo.id, watermarkLabel)} className="text-blue-700 hover:underline" title="Abrir informe con marca de agua">{archivo.nombre}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            <Card className="p-6 border-2 border-sky-300 rounded-xl shadow">
              <div className="flex items-center gap-2 mb-3"><Stethoscope className="h-5 w-5 text-sky-600" /><h2 className="text-lg font-semibold text-sky-700">Exploración física</h2></div>
              <div>{renderExploracion(consulta.exploracion)}</div>
            </Card>

            <Card className="p-6 border-2 border-purple-300 rounded-xl shadow">
              <div className="flex items-center gap-2 mb-3"><Pill className="h-5 w-5 text-purple-600" /><h2 className="text-lg font-semibold text-purple-700">Tratamiento / indicaciones</h2></div>
              <div className="text-sm text-slate-800 whitespace-pre-wrap">{normalizeTextish(consulta.indicaciones) || '—'}</div>
            </Card>
        
          </div>

          <div className="space-y-6">
            <Card className="p-6 border-2 border-rose-300 rounded-xl shadow">
              <div className="flex items-center gap-2 mb-3"><Activity className="h-5 w-5 text-rose-600" /><h2 className="text-lg font-semibold text-rose-700">Signos vitales</h2></div>
              {consulta.signosVitales ? (
                <div className="grid grid-cols-1 gap-3 text-sm text-slate-800">
                  {consulta.signosVitales.presion && (<div className="flex justify-between"><div className="text-xs font-bold text-slate-800 uppercase">Presión</div><div className="font-medium">{consulta.signosVitales.presion}</div></div>)}
                  {consulta.signosVitales.fc && (<div className="flex justify-between"><div className="text-xs font-bold text-slate-800 uppercase">FC</div><div className="font-medium">{consulta.signosVitales.fc}</div></div>)}
                  {consulta.signosVitales.fr && (<div className="flex justify-between"><div className="text-xs font-bold text-slate-800 uppercase">FR</div><div className="font-medium">{consulta.signosVitales.fr}</div></div>)}
                  {consulta.signosVitales.temperatura && (<div className="flex justify-between"><div className="text-xs font-bold text-slate-800 uppercase">Temperatura</div><div className="font-medium">{consulta.signosVitales.temperatura}</div></div>)}
                  {consulta.signosVitales.spo2 && (<div className="flex justify-between"><div className="text-xs font-bold text-slate-800 uppercase">SpO₂</div><div className="font-medium">{consulta.signosVitales.spo2}</div></div>)}
                </div>
              ) : (<div className="text-sm text-slate-600">—</div>)}
            </Card>

            {labStats && labStats.totalValues > 0 && (
              <Card className="p-6 border-2 border-teal-300 rounded-xl shadow">
                <div className="flex items-center gap-2 mb-3"><TestTube className="h-5 w-5 text-teal-600" /><h2 className="text-lg font-semibold text-teal-700">Resumen de Labs</h2></div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-600">Total parámetros</span><span className="font-medium text-slate-900">{labStats.totalValues}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-600">Valores normales</span><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="font-medium text-green-700">{labStats.normalValues}</span></div></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-600">Valores alterados</span><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="font-medium text-red-700">{labStats.abnormalValues}</span></div></div>
                  <div className="pt-2 border-t border-slate-200"><div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-700">% Alterados</span><span className={`font-bold ${ parseInt(labStats.percentageAbnormal) > 30 ? 'text-red-700' : parseInt(labStats.percentageAbnormal) > 10 ? 'text-yellow-700' : 'text-green-700' }`}>{labStats.percentageAbnormal}%</span></div></div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function safeParse<T = unknown>(s: string): T | undefined {
  try { return JSON.parse(s) as T } catch { return undefined }
}