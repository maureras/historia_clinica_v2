// src/pages/admin/reports/ModificationReports.tsx
import React, { useEffect, useState } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  FileText, 
  User as UserIcon, 
  RefreshCw,
  Calendar,
  AlertCircle,
  X,
  ArrowRightLeft,
  History
} from 'lucide-react'
import { Card, Button, Alert } from '@/components/ui'
import { 
  useSecurityActions, 
  useModificationLogs, 
  useSecurityLoading, 
  useSecurityError,
  useInitializeSecurity 
} from '@/stores/mockSecurityStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { SecurityReportFilters, EntityType, ModificationAction, ModificationLog } from '@/types/security'
import { getModificationLogs, exportModificationPDF } from '@/services/reports'

export default function ModificationReports() {
  // ✅ Carga de datos iniciales
  useInitializeSecurity()

  const { loadModificationLogs, setModificationFilters, clearModificationFilters, exportReport } = useSecurityActions()
  const { data: modificationLogs, filters, pagination } = useModificationLogs()
  const loading = useSecurityLoading()
  const error = useSecurityError()
  const [apiData, setApiData] = useState<any | null>(null)
  const [apiErr, setApiErr] = useState<string | null>(null)
  const [apiLoading, setApiLoading] = useState(false)

  const [showFilters, setShowFilters] = useState(false)
  type UIUser = { firstName?: string; lastName?: string; role?: string; email?: string | null; id?: string }
  type LocalModificationRow = Omit<ModificationLog, 'user' | 'createdAt' | 'entityType' | 'action' | 'fieldName'> & {
    user?: UIUser
    createdAt?: string | Date
    entityType?: EntityType
    action?: ModificationAction
    fieldName?: string
    /** Nombre derivado del paciente (fallback cuando no hay objeto patient) */
    patientName?: string
  }
  const [selectedModification, setSelectedModification] = useState<LocalModificationRow | null>(null)
  const normalizeModification = (m: any): LocalModificationRow => {
    return {
      ...m,
      // Campos que pueden venir ausentes en los mocks
      userAgent: (m as any).userAgent ?? 'Desconocido',
      updatedAt: (m as any).updatedAt ?? m.createdAt
    }
  }
  const [localFilters, setLocalFilters] = useState<SecurityReportFilters>({
    ...filters
  })

  useEffect(() => {
    loadModificationLogs()
  }, [loadModificationLogs])

  const handleFilterChange = (key: string, value: string | Date | null) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const applyFilters = () => {
    setModificationFilters(localFilters)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setLocalFilters({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    clearModificationFilters()
    setShowFilters(false)
  }

  const mapApiRowToUi = (r: any): LocalModificationRow => {
    const safeParse = (val: any) => {
      try { return typeof val === 'string' ? JSON.parse(val) : val } catch { return null }
    }
    const toDisplay = (v: any): string => {
      if (v == null) return ''
      if (typeof v === 'object') {
        // Si vienen nombres, muestra "Nombre Apellido"
        const first = (v as any).firstName ?? (v as any).nombre
        const last  = (v as any).lastName ?? (v as any).apellido
        if (first || last) return [first, last].filter(Boolean).join(' ')
        try { return JSON.stringify(v) } catch { return String(v) }
      }
      return String(v)
    }

    const diffObj = safeParse(r.diff)

    // Extrae campo/valores de `changes` si existe
    let inferredField: string | undefined = r.fieldName
    let prevFromChanges: any = undefined
    let nextFromChanges: any = undefined
    if (diffObj && diffObj.changes && typeof diffObj.changes === 'object') {
      const k = Object.keys(diffObj.changes)[0]
      if (k) {
        inferredField = inferredField ?? k
        prevFromChanges = diffObj.changes[k]?.from
        nextFromChanges = diffObj.changes[k]?.to
      }
    }

    const prevRaw = r.previousValue ?? diffObj?.previousValue ?? prevFromChanges ?? null
    const nextRaw = r.newValue ?? diffObj?.newValue ?? nextFromChanges ?? null

    const previousValue = toDisplay(prevRaw)
    const newValue = toDisplay(nextRaw)
    const fieldName = inferredField ?? diffObj?.fieldName

    // patientId y patient (nombre) con múltiples fuentes
    const patientId =
      r.patientId ??
      r.entityId ??
      diffObj?.patientId ??
      (r.recurso === 'patient' ? r.entityId : '')

    // Helper to derive a patient {firstName,lastName} from multiple possible shapes
    const asPatient = (v: any) => {
      if (!v) return undefined
      if (typeof v === 'object') {
        const fn = (v as any).firstName ?? (v as any).nombre
        const ln = (v as any).lastName ?? (v as any).apellido
        if (fn || ln) return { firstName: fn ?? '', lastName: ln ?? '' }
        return undefined
      }
      if (typeof v === 'string') {
        // try JSON first
        try {
          const o = JSON.parse(v)
          return asPatient(o)
        } catch { /* not JSON */ }
        const s = v.trim()
        if (!s) return undefined
        const parts = s.split(/\s+/)
        if (parts.length >= 2) {
          return { firstName: parts.slice(0, parts.length - 1).join(' '), lastName: parts[parts.length - 1] }
        }
        return { firstName: s, lastName: '' }
      }
      return undefined
    }

    const patient =
      r.patient ??
      asPatient(diffObj?.previousValue) ??
      asPatient(diffObj?.created) ??
      asPatient(prevRaw) ??
      asPatient(nextRaw)

    // Nombre derivado (fallback) para mostrar en la UI aunque no exista objeto patient
    const getNameFromAny = (v: any): string => {
      if (!v) return ''
      if (typeof v === 'object') {
        const fn = (v as any).firstName ?? (v as any).nombre
        const ln = (v as any).lastName ?? (v as any).apellido
        if (fn || ln) return [fn, ln].filter(Boolean).join(' ')
        try { return JSON.stringify(v) } catch { return String(v) }
      }
      if (typeof v === 'string') {
        // intenta parsear json
        try {
          const o = JSON.parse(v)
          return getNameFromAny(o)
        } catch { /* plain string */ }
        return v
      }
      return String(v)
    }
    const patientName =
      (typeof r.patientName === 'string' && r.patientName) ||
      (typeof diffObj?.patientName === 'string' && diffObj.patientName) ||
      (patient ? [patient.firstName, patient.lastName].filter(Boolean).join(' ') : '') ||
      getNameFromAny(diffObj?.patientName) ||
      getNameFromAny(diffObj?.previousValue) ||
      getNameFromAny(diffObj?.created) ||
      getNameFromAny(prevRaw) ||
      getNameFromAny(nextRaw)

    return {
      id: r.id,
      // Campos requeridos por LocalModificationRow
      userId: r.actor?.id ?? r.userId ?? '',
      entityId: r.entityId ?? '',
      updatedAt: r.updatedAt ?? r.createdAt ?? new Date().toISOString(),

      // Usuario simplificado para la UI
      user: r.actor ? { firstName: r.actor.firstName, lastName: r.actor.lastName, role: r.actor.role } : undefined,

      // Fecha de creación
      createdAt: r.createdAt,

      // Normalizaciones
      entityType: (r.recurso as any) || 'medical_record',
      action: (['create','update','delete','restore'] as const).includes(String(r.accion || '').toLowerCase() as any) ? (r.accion as any) : 'update',
      fieldName,
      previousValue,
      newValue,

      // Paciente derivado
      patient,
      patientId,
      patientName,

      // Extras UI
      ipAddress: r.ip,
      userAgent: r.userAgent,
    }
  }

  const rows: LocalModificationRow[] = apiData?.items ? apiData.items.map(mapApiRowToUi) : (modificationLogs as unknown as LocalModificationRow[])
  const totalCount = apiData?.total ?? pagination.total
  useEffect(() => {
    // Mapea filtros locales a query del backend
    const f = localFilters ?? filters
    const toISO = (d: Date) => d.toISOString().slice(0, 10)
    const params: any = {
      userId: (f as any).userId || undefined,
      recurso: (f as any).entityType || undefined,
      accion: (f as any).action || undefined,
      from: (f as any).dateFrom ? toISO((f as any).dateFrom) : undefined,
      to: (f as any).dateTo ? toISO((f as any).dateTo) : undefined,
    }
    let cancelled = false
    ;(async () => {
      try {
        setApiErr(null)
        setApiLoading(true)
        const resp = await getModificationLogs(params)
        if (!cancelled) setApiData(resp)
      } catch (e: any) {
        if (!cancelled) {
          setApiErr(e?.message ?? 'Error al cargar modificaciones')
          setApiData(null)
        }
      } finally {
        if (!cancelled) setApiLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [filters, localFilters])

  const exportPdf = async () => {
    const f = localFilters ?? filters
    const toISO = (d: Date) => d.toISOString().slice(0, 10)
    const from = (f as any).dateFrom ? toISO((f as any).dateFrom) : undefined
    const to = (f as any).dateTo ? toISO((f as any).dateTo) : undefined
    await exportModificationPDF({
      userId: (f as any).userId || undefined,
      recurso: (f as any).entityType || undefined,
      accion: (f as any).action || undefined,
      fieldName: (f as any).fieldName || undefined,
      patientId: (f as any).patientId || undefined,
      from, to,
    })
  }

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    await exportReport({
      reportType: 'modification',
      format,
      filters,
      includeMetadata: true,
      watermark: true
    })
  }

  const getEntityTypeLabel = (type: EntityType) => {
    const labels = {
      patient: 'Paciente',
      medical_record: 'Historia Clínica',
      consultation: 'Consulta',
      diagnosis: 'Diagnóstico',
      prescription: 'Prescripción',
      lab_result: 'Resultado Lab',
      vaccination: 'Vacunación',
      surgery: 'Cirugía',
      user: 'Usuario'
    }
    return labels[type] || type
  }

  const getActionLabel = (action: ModificationAction) => {
    const labels = {
      create: 'Crear',
      update: 'Actualizar',
      delete: 'Eliminar',
      restore: 'Restaurar'
    }
    return labels[action] || action
  }

  const getActionColor = (action: ModificationAction) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      restore: 'bg-yellow-100 text-yellow-800'
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  const formatFieldName = (fieldName: string): string => {
    // Convierte nombres de campos técnicos a etiquetas amigables
    const fieldLabels: Record<string, string> = {
      firstName: 'Nombre',
      lastName: 'Apellido',
      email: 'Email',
      phone: 'Teléfono',
      address: 'Dirección',
      diagnosis: 'Diagnóstico',
      treatment: 'Tratamiento',
      medication: 'Medicamento',
      dosage: 'Dosis',
      bloodPressure: 'Presión Arterial',
      temperature: 'Temperatura',
      weight: 'Peso',
      height: 'Altura',
      allergies: 'Alergias',
      chronicConditions: 'Condiciones Crónicas'
    }
    return fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <div>
          <p className="font-medium">Error al cargar el reporte de modificaciones</p>
          <p className="text-sm">{error}</p>
        </div>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <Card variant="default" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Reporte de Modificaciones
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {totalCount} modificaciones registradas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadModificationLogs()}
              disabled={loading} >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>

          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Usuario
                </label>
                <input
                  type="text"
                  placeholder="Buscar por usuario..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
                  value={localFilters.userId || ''}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
                  value={localFilters.dateFrom ? format(localFilters.dateFrom, 'yyyy-MM-dd') : ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value ? new Date(e.target.value) : null)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
                  value={localFilters.dateTo ? format(localFilters.dateTo, 'yyyy-MM-dd') : ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value ? new Date(e.target.value) : null)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Entidad
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
                  value={localFilters.entityType || ''}
                  onChange={(e) => handleFilterChange('entityType', e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="patient">Paciente</option>
                  <option value="medical_record">Historia Clínica</option>
                  <option value="consultation">Consulta</option>
                  <option value="diagnosis">Diagnóstico</option>
                  <option value="prescription">Prescripción</option>
                  <option value="lab_result">Resultado Lab</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Acción
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
                  value={localFilters.action || ''}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">Todas las acciones</option>
                  <option value="create">Crear</option>
                  <option value="update">Actualizar</option>
                  <option value="delete">Eliminar</option>
                  <option value="restore">Restaurar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Campo Modificado
                </label>
                <input
                  type="text"
                  placeholder="ej: nombre, email..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
                  value={localFilters.fieldName || ''}
                  onChange={(e) => handleFilterChange('fieldName', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ID Paciente
                </label>
                <input
                  type="text"
                  placeholder="PAC001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
                  value={localFilters.patientId || ''}
                  onChange={(e) => handleFilterChange('patientId', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
                Limpiar
              </Button>
              <Button variant="primary" size="sm" onClick={applyFilters}>
                <Search className="h-4 w-4" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        )}

        {/* Botones de exportación */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={exportPdf}
            disabled={loading}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </Card>

      {apiErr && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-medium">No se pudieron cargar modificaciones desde el backend</p>
            <p className="text-sm">{apiErr}</p>
          </div>
        </Alert>
      )}
      {/* Tabla de modificaciones */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Fecha/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Paciente/Entidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tipo/Acción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Campo Modificado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Cambios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {(loading || apiLoading) && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                      Cargando modificaciones...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron modificaciones registradas
                  </td>
                </tr>
              ) : (
                (rows as LocalModificationRow[]).map((modification) => (
                  <tr key={modification.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-slate-900">
                            {modification.user?.firstName} {modification.user?.lastName}
                          </div>
                          <div className="text-sm text-slate-500">{modification.user?.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                        {format(new Date(modification.createdAt ?? Date.now()), "dd/MM/yyyy HH:mm", { locale: es })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {(modification.patient || modification.patientName || modification.patientId) ? (
                        <div>
                          {(modification.patient || modification.patientName) && (
                            <div className="font-medium">
                              {modification.patient
                                ? `${modification.patient.firstName} ${modification.patient.lastName}`
                                : modification.patientName}
                            </div>
                          )}
                          <div className="text-slate-500">{modification.patientId || modification.entityId}</div>
                        </div>
                      ) : (
                        <div className="text-slate-500">Sistema</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {getEntityTypeLabel((modification.entityType ?? 'patient') as EntityType)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor((modification.action ?? 'update') as ModificationAction)}`}>
                          {getActionLabel((modification.action ?? 'update') as ModificationAction)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="font-medium">{formatFieldName(modification.fieldName ?? '')}</div>
                      <div className="text-xs text-slate-500">{modification.fieldName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        {modification.action !== 'delete' && (
                          <>
                            {modification.previousValue && (
                              <div className="text-sm mb-1">
                                <span className="text-red-600 font-medium">Anterior:</span>
                                <div className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs mt-1 truncate">
                                  {modification.previousValue}
                                </div>
                              </div>
                            )}
                            {modification.newValue && (
                              <div className="text-sm">
                                <span className="text-green-600 font-medium">Nuevo:</span>
                                <div className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs mt-1 truncate">
                                  {modification.newValue}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {modification.action === 'delete' && (
                          <div className="text-sm">
                            <span className="text-red-600 font-medium">Eliminado:</span>
                            <div className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs mt-1 truncate">
                              {modification.previousValue || 'Registro completo'}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedModification(normalizeModification(modification))}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-slate-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button 
                  variant="outline" 
                  disabled={pagination.page === 1}
                  onClick={() => setModificationFilters({ ...filters, page: pagination.page - 1 })}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setModificationFilters({ ...filters, page: pagination.page + 1 })}
                >
                  Siguiente
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-700">
                    Mostrando <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> a{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    de <span className="font-medium">{pagination.total}</span> resultados
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setModificationFilters({ ...filters, page: pagination.page - 1 })}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-slate-700">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setModificationFilters({ ...filters, page: pagination.page + 1 })}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalles */}
      {selectedModification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-600" />
                  Detalles de Modificación
                </h3>
                <Button variant="outline" size="sm" onClick={() => setSelectedModification(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Usuario</label>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedModification.user?.firstName} {selectedModification.user?.lastName}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Fecha/Hora</label>
                    <div className="mt-1 text-sm text-slate-900">
                      {format(new Date(selectedModification.createdAt ?? Date.now()), "dd/MM/yyyy 'a las' HH:mm:ss", { locale: es })}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Tipo de Entidad</label>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {getEntityTypeLabel((selectedModification.entityType ?? 'patient') as EntityType)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Acción</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor((selectedModification.action ?? 'update') as ModificationAction)}`}>
                        {getActionLabel((selectedModification.action ?? 'update') as ModificationAction)}
                      </span>
                    </div>
                  </div>
                </div>

                {(selectedModification.patient || selectedModification.patientName || selectedModification.patientId) && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Paciente</label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-md">
                      {selectedModification.patient || selectedModification.patientName ? (
                        <div className="font-medium">
                          {selectedModification.patient
                            ? `${selectedModification.patient.firstName} ${selectedModification.patient.lastName}`
                            : selectedModification.patientName}
                        </div>
                      ) : (
                        <div className="font-medium text-slate-700">Paciente</div>
                      )}
                      <div className="text-sm text-slate-600">
                        {selectedModification.patientId || selectedModification.entityId}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-700">Campo Modificado</label>
                  <div className="mt-1 text-sm text-slate-900">
                    <span className="font-medium">{formatFieldName(selectedModification.fieldName ?? '')}</span>
                    <span className="text-slate-500 ml-2">({selectedModification.fieldName ?? ''})</span>
                  </div>
                </div>

                {selectedModification.action !== 'create' && selectedModification.previousValue && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Valor Anterior</label>
                    <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="text-red-800 text-sm font-mono">{selectedModification.previousValue}</div>
                    </div>
                  </div>
                )}

                {selectedModification.action !== 'delete' && selectedModification.newValue && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Valor Nuevo</label>
                    <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="text-green-800 text-sm font-mono">{selectedModification.newValue}</div>
                    </div>
                  </div>
                )}

                {selectedModification.reason && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Motivo</label>
                    <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-blue-800 text-sm">{selectedModification.reason}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                  <div>
                    <label className="font-medium">IP Address</label>
                    <div>{selectedModification.ipAddress}</div>
                  </div>
                  <div>
                    <label className="font-medium">Entity ID</label>
                    <div>{selectedModification.entityId}</div>
                  </div>
                </div>

                {selectedModification.metadata && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Metadatos</label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-md">
                      <pre className="text-xs text-slate-700 overflow-auto">
                        {JSON.stringify(selectedModification.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setSelectedModification(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}