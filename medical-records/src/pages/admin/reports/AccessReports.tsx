// src/pages/admin/reports/AccessReports.tsx
import React, { useEffect, useState } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Clock, 
  User, 
  Monitor, 
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react'
import { getAccessLogs, downloadAccessPDF } from '@/services/reports'
import { Card, Button, Alert } from '@/components/ui'
import { 
  useSecurityActions, 
  useAccessLogs, 
  useSecurityLoading, 
  useSecurityError,
  useInitializeSecurity 
} from '@/stores/mockSecurityStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import type { SecurityReportFilters, AccessType } from '@/types/security'

type AccessRow = {
  id: string
  user?: { firstName?: string; lastName?: string; role?: string }
  createdAt: string | Date
  ipAddress?: string
  accessType: AccessType
  patient?: { firstName?: string; lastName?: string } | undefined
  patientId?: string | undefined
  sessionDuration?: number | undefined
  success: boolean
}


export default function AccessReports() {
  // ✅ Carga de datos iniciales
  useInitializeSecurity()

  const { loadAccessLogs, setAccessFilters, clearAccessFilters, exportReport } = useSecurityActions()
  const { data: accessLogs, filters, pagination } = useAccessLogs()
  const loading = useSecurityLoading()
  const error = useSecurityError()

  const [apiData, setApiData] = useState<any | null>(null)
  const [apiErr, setApiErr] = useState<string | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const mapApiRowToUi = (r: any) => ({
    id: r.id,
    user: r.actor
      ? { firstName: r.actor.firstName, lastName: r.actor.lastName, role: r.actor.role }
      : undefined,
    createdAt: r.createdAt,
    ipAddress: r.ip ?? '',
    accessType: (r.accion ?? 'view_medical_record') as AccessType,
    patient: undefined,
    patientId: undefined,
    sessionDuration: undefined,
    success: r.accion && (String(r.accion).includes('failed') || String(r.accion).includes('unauthorized')) ? false : true,
  })

  const rows = apiData?.items ? apiData.items.map(mapApiRowToUi) : accessLogs
  const totalCount = apiData?.total ?? pagination.total
  useEffect(() => {
    const f = localFilters ?? filters
    const toISO = (d: Date) => d.toISOString().slice(0, 10)
    const params: any = {
      userId: (f as any).userId || undefined,
      ip: (f as any).ipAddress || undefined,
      accion: (f as any).accessType || undefined,
      from: (f as any).dateFrom ? toISO((f as any).dateFrom) : undefined,
      to: (f as any).dateTo ? toISO((f as any).dateTo) : undefined,
    }
    let cancelled = false
    ;(async () => {
      try {
        setApiErr(null)
        setApiLoading(true)
        const resp = await getAccessLogs(params)
        if (!cancelled) setApiData(resp)
      } catch (e: any) {
        if (!cancelled) {
          setApiErr(e?.message ?? 'Error al cargar accesos')
          setApiData(null)
        }
      } finally {
        if (!cancelled) setApiLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [filters])

  const [showFilters, setShowFilters] = useState(false)
  const [localFilters, setLocalFilters] = useState<SecurityReportFilters>({
    ...filters
  })

  const handleFilterChange = (
    key: string,
    value: string | Date | null | boolean | undefined
  ) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const applyFilters = () => {
    setAccessFilters(localFilters)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setLocalFilters({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    clearAccessFilters()
    setShowFilters(false)
  }

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    await exportReport({
      reportType: 'access',
      format,
      filters,
      includeMetadata: true,
      watermark: true
    })
  }

  const getAccessTypeLabel = (type: AccessType) => {
    const labels = {
      login: 'Inicio de sesión',
      logout: 'Cierre de sesión',
      view_patient: 'Ver paciente',
      edit_patient: 'Editar paciente',
      create_patient: 'Crear paciente',
      delete_patient: 'Eliminar paciente',
      view_medical_record: 'Ver HC',
      edit_medical_record: 'Editar HC',
      create_consultation: 'Crear consulta',
      edit_consultation: 'Editar consulta',
      print_document: 'Imprimir documento',
      export_data: 'Exportar datos',
      failed_login: 'Login fallido',
      unauthorized_access: 'Acceso no autorizado'
    }
    return labels[type] || type
  }

  const getAccessTypeColor = (type: AccessType) => {
    if (type.includes('failed') || type.includes('unauthorized')) {
      return 'text-red-600 bg-red-50'
    }
    if (type.includes('create') || type.includes('edit') || type.includes('delete')) {
      return 'text-orange-600 bg-orange-50'
    }
    if (type.includes('view') || type.includes('login')) {
      return 'text-blue-600 bg-blue-50'
    }
    return 'text-gray-600 bg-gray-50'
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <div>
          <p className="font-medium">Error al cargar el reporte de accesos</p>
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
              <Monitor className="h-5 w-5 text-blue-600" />
              Reporte de Accesos al Sistema
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {totalCount} registros encontrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAccessLogs()}
              disabled={loading}
            >
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={localFilters.dateTo ? format(localFilters.dateTo, 'yyyy-MM-dd') : ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value ? new Date(e.target.value) : null)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  IP Address
                </label>
                <input
                  type="text"
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={localFilters.ipAddress || ''}
                  onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Acceso
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={localFilters.accessType || ''}
                  onChange={(e) => handleFilterChange('accessType', e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="login">Inicio de sesión</option>
                  <option value="view_patient">Ver paciente</option>
                  <option value="edit_patient">Editar paciente</option>
                  <option value="view_medical_record">Ver HC</option>
                  <option value="print_document">Imprimir</option>
                  <option value="failed_login">Login fallido</option>
                  <option value="unauthorized_access">Acceso no autorizado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estado
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={localFilters.success !== undefined ? String(localFilters.success) : ''}
                  onChange={(e) => handleFilterChange('success', e.target.value === '' ? undefined : e.target.value === 'true')}
                >
                  <option value="">Todos</option>
                  <option value="true">Exitosos</option>
                  <option value="false">Fallidos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ID Paciente
                </label>
                <input
                  type="text"
                  placeholder="PAC001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
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
  onClick={() => downloadAccessPDF(filters.dateFrom ?? undefined, filters.dateTo ?? undefined)}
            disabled={loading}
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>

        </div>



        
      </Card>

      {/* Tabla de accesos */}
      {apiErr && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-medium">No se pudieron cargar accesos desde el backend</p>
            <p className="text-sm">{apiErr}</p>
          </div>
        </Alert>
      )}
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
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tipo de Acceso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Recurso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {(loading || apiLoading) && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                      Cargando datos...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron registros de acceso
                  </td>
                </tr>
              ) : (
                (rows as AccessRow[]).map((access) => (
                  <tr key={access.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-slate-900">
                            {access.user?.firstName} {access.user?.lastName}
                          </div>
                          <div className="text-sm text-slate-500">{access.user?.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                        {format(new Date(access.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-900">
                        <Monitor className="h-4 w-4 text-slate-400 mr-2" />
                        {access.ipAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccessTypeColor(access.accessType)}`}>
                        {getAccessTypeLabel(access.accessType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {access.patient ? (
                        <div>
                          <div className="font-medium">{access.patient.firstName} {access.patient.lastName}</div>
                          <div className="text-slate-500">{access.patientId}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500">Sistema</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {access.sessionDuration && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-slate-400 mr-1" />
                          {access.sessionDuration} min
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        access.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {access.success ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Exitoso
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Fallido
                          </>
                        )}
                      </span>
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
                  onClick={() => setAccessFilters({ ...filters, page: pagination.page - 1 })}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setAccessFilters({ ...filters, page: pagination.page + 1 })}
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
                    onClick={() => setAccessFilters({ ...filters, page: pagination.page - 1 })}
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
                    onClick={() => setAccessFilters({ ...filters, page: pagination.page + 1 })}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}