// src/pages/admin/reports/PrintReports.tsx
import React, { useEffect, useState } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Printer, 
  User, 
  RefreshCw,
  Calendar,
  AlertCircle,
  X,
  FileText,
  Hash,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { getPrintLogs, downloadReportCSV } from '@/services/reports'
import { Card, Button, Alert } from '@/components/ui'
import { useSecurityActions, usePrintLogs, useSecurityLoading, useSecurityError } from '@/stores/mockSecurityStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { SecurityReportFilters, DocumentType, PrintUrgency, PrintStatus, PrintLog } from '@/types/security'

export default function PrintReports() {
  const { loadPrintLogs, setPrintFilters, clearPrintFilters, exportReport } = useSecurityActions()
  const { data: printLogs, filters, pagination } = usePrintLogs()
  const loading = useSecurityLoading()
  const error = useSecurityError()

  const [showFilters, setShowFilters] = useState(false)
  const [localFilters, setLocalFilters] = useState<SecurityReportFilters>({
    ...filters
  })
  // API state
  const [apiData, setApiData] = useState<any | null>(null)
  const [apiErr, setApiErr] = useState<string | null>(null)
  const [apiLoading, setApiLoading] = useState(false)

  type LocalPrintRow = {
    id: string
    user?: { firstName?: string; lastName?: string; role?: string; email?: string | null }
    createdAt: string | Date
    patient?: { firstName?: string; lastName?: string; documentType?: string; documentNumber?: string } | null
    patientId?: string | null
    documentTitle: string
    documentType: DocumentType
    pageCount: number
    urgency: PrintUrgency
    status: PrintStatus
    documentHash?: string
    printHash?: string
    reason?: string | null
    ipAddress?: string | null
    printerName?: string | null
    watermark: {
      userName?: string
      userId?: string
      timestamp?: string | number | Date
      ipAddress?: string
      documentId?: string
      uniqueId?: string
    }
    errorMessage?: string | null
    metadata?: any
    userAgent?: string | null
  }

  const [selectedPrint, setSelectedPrint] = useState<LocalPrintRow | null>(null)

  const handleFilterChange = (key: string, value: string | Date | null) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const applyFilters = () => {
    setPrintFilters(localFilters)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setLocalFilters({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    clearPrintFilters()
    setShowFilters(false)
  }

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    await exportReport({
      reportType: 'print',
      format,
      filters,
      includeMetadata: true,
      watermark: true
    })
  }
  // Map backend row to LocalPrintRow
  const mapApiRowToUi = (r: any): LocalPrintRow => ({
    id: r.id,
    user: r.actor ? { firstName: r.actor.firstName, lastName: r.actor.lastName, role: r.actor.role, email: r.actor.email ?? null } : undefined,
    createdAt: r.createdAt,
    patient: null,
    patientId: null,
    documentTitle: r.recurso ?? '',
    documentType: (localFilters.documentType as DocumentType) || 'medical_record_complete',
    pageCount: Number(r.pageCount ?? 1),
    urgency: (localFilters.urgency as PrintUrgency) || 'normal',
    status: (localFilters.status as PrintStatus) || 'completed',
    documentHash: r.documentHash ?? '',
    printHash: r.printHash ?? '',
    reason: r.motivo ?? null,
    ipAddress: r.ip ?? null,
    printerName: r.printerName ?? null,
    watermark: {
      userName: r.actor ? `${r.actor.firstName} ${r.actor.lastName}` : undefined,
      userId: r.actor?.id ?? undefined,
      timestamp: r.createdAt,
      ipAddress: r.ip ?? undefined,
      documentId: r.documentId ?? undefined,
      uniqueId: r.id
    },
    errorMessage: r.errorMessage ?? null,
    metadata: r.metadata ?? undefined,
    userAgent: r.userAgent ?? null,
  })

  useEffect(() => {
    const f = localFilters ?? filters
    const toISO = (d: Date) => d.toISOString().slice(0, 10)
    const params: any = {
      userId: (f as any).userId || undefined,
      recurso: (f as any).documentType || undefined,
      motivo: (f as any).reason || undefined,
      from: (f as any).dateFrom ? toISO((f as any).dateFrom) : undefined,
      to: (f as any).dateTo ? toISO((f as any).dateTo) : undefined,
    }
    let cancelled = false
    ;(async () => {
      try {
        setApiErr(null)
        setApiLoading(true)
        const resp = await getPrintLogs(params)
        if (!cancelled) setApiData(resp)
      } catch (e: any) {
        if (!cancelled) {
          setApiErr(e?.message ?? 'Error al cargar impresiones')
          setApiData(null)
        }
      } finally {
        if (!cancelled) setApiLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [filters, localFilters])

  const apiRows: LocalPrintRow[] = apiData?.items ? apiData.items.map(mapApiRowToUi) : []
  const rows: LocalPrintRow[] = apiRows.length ? apiRows : (printLogs as unknown as LocalPrintRow[])
  const totalCount = apiData?.total ?? pagination.total
  const totalPagesPrinted = rows.reduce((sum, r) => sum + (Number(r.pageCount) || 0), 0)

  const getDocumentTypeLabel = (type: DocumentType) => {
    const labels = {
      medical_record_complete: 'HC Completa',
      medical_record_summary: 'Resumen HC',
      consultation_report: 'Consulta',
      prescription: 'Receta',
      lab_results: 'Laboratorio',
      vaccination_record: 'Vacunación',
      surgery_report: 'Cirugía',
      patient_summary: 'Resumen Paciente',
      discharge_summary: 'Alta Médica'
    }
    return labels[type] || type
  }

  const getUrgencyColor = (urgency: PrintUrgency) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-yellow-100 text-yellow-800',
      emergency: 'bg-red-100 text-red-800'
    }
    return colors[urgency] || 'bg-gray-100 text-gray-800'
  }

  const getUrgencyLabel = (urgency: PrintUrgency) => {
    const labels = {
      low: 'Baja',
      normal: 'Normal',
      high: 'Alta',
      emergency: 'Emergencia'
    }
    return labels[urgency] || urgency
  }

  const getStatusColor = (status: PrintStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: PrintStatus) => {
    const labels = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido',
      cancelled: 'Cancelado'
    }
    return labels[status] || status
  }

  const getStatusIcon = (status: PrintStatus) => {
    const icons = {
      pending: Clock,
      processing: RefreshCw,
      completed: CheckCircle,
      failed: XCircle,
      cancelled: AlertTriangle
    }
    return icons[status] || AlertCircle
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <div>
          <p className="font-medium">Error al cargar el reporte de impresiones</p>
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
              <Printer className="h-5 w-5 text-green-600" />
              Registro de Impresiones
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {totalCount} impresiones registradas • {totalPagesPrinted} páginas totales
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPrintLogs()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filtros
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
                  value={localFilters.dateTo ? format(localFilters.dateTo, 'yyyy-MM-dd') : ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value ? new Date(e.target.value) : null)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Documento
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
                  value={localFilters.documentType || ''}
                  onChange={(e) => handleFilterChange('documentType', e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="medical_record_complete">HC Completa</option>
                  <option value="medical_record_summary">Resumen HC</option>
                  <option value="consultation_report">Consulta</option>
                  <option value="prescription">Receta</option>
                  <option value="lab_results">Laboratorio</option>
                  <option value="vaccination_record">Vacunación</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Urgencia
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
                  value={localFilters.urgency || ''}
                  onChange={(e) => handleFilterChange('urgency', e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="low">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="emergency">Emergencia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estado
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
                  value={localFilters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="completed">Completado</option>
                  <option value="failed">Fallido</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Motivo
                </label>
                <input
                  type="text"
                  placeholder="Buscar en motivo..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
                  value={localFilters.reason || ''}
                  onChange={(e) => handleFilterChange('reason', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ID Paciente
                </label>
                <input
                  type="text"
                  placeholder="PAC001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
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
            onClick={() => handleExport('excel')}
            disabled={loading}
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={loading}
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadReportCSV('prints', localFilters.dateFrom ?? undefined, localFilters.dateTo ?? undefined)}
            disabled={loading}
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </Card>

      {/* API Error warning */}
      {apiErr && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-medium">No se pudieron cargar impresiones desde el backend</p>
            <p className="text-sm">{apiErr}</p>
          </div>
        </Alert>
      )}
      {/* Tabla de impresiones */}
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
                  Paciente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Páginas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Urgencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Hash/ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {(loading || apiLoading) && rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                      Cargando registro de impresiones...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron impresiones registradas
                  </td>
                </tr>
              ) : (
                (rows as LocalPrintRow[]).map((printLog) => {
                  const StatusIcon = getStatusIcon(printLog.status)
                  return (
                    <tr key={printLog.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-slate-900">
                              {printLog.user?.firstName} {printLog.user?.lastName}
                            </div>
                            <div className="text-sm text-slate-500">{printLog.user?.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                          {format(new Date(printLog.createdAt ?? Date.now()), "dd/MM/yyyy HH:mm", { locale: es })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {printLog.patient ? (
                          <div>
                            <div className="font-medium">{printLog.patient.firstName} {printLog.patient.lastName}</div>
                            <div className="text-slate-500">{printLog.patientId}</div>
                          </div>
                        ) : (
                          <div className="text-slate-500">N/A</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{printLog.documentTitle}</div>
                          <div className="text-sm text-slate-500 flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            {getDocumentTypeLabel(printLog.documentType)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-lg font-semibold text-slate-900">{printLog.pageCount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(printLog.urgency)}`}>
                          {getUrgencyLabel(printLog.urgency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(printLog.status)}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {getStatusLabel(printLog.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center text-slate-600">
                            <Hash className="h-3 w-3 mr-1" />
                            <span className="font-mono">{printLog.documentHash}</span>
                          </div>
                          <div className="flex items-center text-slate-500">
                            <Shield className="h-3 w-3 mr-1" />
                            <span className="font-mono">{printLog.printHash}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedPrint(printLog)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
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
                  onClick={() => setPrintFilters({ ...filters, page: pagination.page - 1 })}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPrintFilters({ ...filters, page: pagination.page + 1 })}
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
                    onClick={() => setPrintFilters({ ...filters, page: pagination.page - 1 })}
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
                    onClick={() => setPrintFilters({ ...filters, page: pagination.page + 1 })}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalles de Impresión */}
      {selectedPrint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Printer className="h-5 w-5 text-green-600" />
                  Detalles de Impresión
                </h3>
                <Button variant="outline" size="sm" onClick={() => setSelectedPrint(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Usuario</label>
                      <div className="mt-1 p-3 bg-slate-50 rounded-md">
                        <div className="font-medium">{selectedPrint.user?.firstName} {selectedPrint.user?.lastName}</div>
                        <div className="text-sm text-slate-600">{selectedPrint.user?.role} • {selectedPrint.user?.email}</div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Paciente</label>
                      <div className="mt-1 p-3 bg-slate-50 rounded-md">
                        {selectedPrint.patient ? (
                          <>
                            <div className="font-medium">{selectedPrint.patient.firstName} {selectedPrint.patient.lastName}</div>
                            <div className="text-sm text-slate-600">{selectedPrint.patient.documentType}: {selectedPrint.patient.documentNumber}</div>
                            <div className="text-sm text-slate-500">ID: {selectedPrint.patientId}</div>
                          </>
                        ) : (
                          <div className="text-slate-500">No disponible</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Fecha y Hora</label>
                      <div className="mt-1 p-3 bg-slate-50 rounded-md">
                        <div className="font-medium">{format(new Date(selectedPrint.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}</div>
                        <div className="text-sm text-slate-600">{format(new Date(selectedPrint.createdAt), "HH:mm:ss", { locale: es })}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Documento</label>
                      <div className="mt-1 p-3 bg-slate-50 rounded-md">
                        <div className="font-medium">{selectedPrint.documentTitle}</div>
                        <div className="text-sm text-slate-600">{getDocumentTypeLabel(selectedPrint.documentType)}</div>
                        <div className="text-sm text-slate-500">Páginas: {selectedPrint.pageCount}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Urgencia</label>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(selectedPrint.urgency)}`}>
                            {getUrgencyLabel(selectedPrint.urgency)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Estado</label>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedPrint.status)}`}>
                            {React.createElement(getStatusIcon(selectedPrint.status), { className: "h-4 w-4 mr-1" })}
                            {getStatusLabel(selectedPrint.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Información Técnica</label>
                      <div className="mt-1 p-3 bg-slate-50 rounded-md text-sm">
                        <div><strong>IP:</strong> {selectedPrint.ipAddress}</div>
                        {selectedPrint.printerName && <div><strong>Impresora:</strong> {selectedPrint.printerName}</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Motivo */}
                <div>
                  <label className="text-sm font-medium text-slate-700">Motivo de Impresión</label>
                  <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-blue-800">{selectedPrint.reason}</div>
                  </div>
                </div>

                {/* Información de Marca de Agua */}
                <div>
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Información de Marca de Agua
                  </label>
                  <div className="mt-1 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div><strong>Usuario:</strong> {selectedPrint.watermark.userName}</div>
                        <div><strong>ID Usuario:</strong> {selectedPrint.watermark.userId}</div>
{format(new Date(selectedPrint.watermark.timestamp ?? Date.now()), "dd/MM/yyyy HH:mm:ss", { locale: es })}      
                </div>
                      <div>
                        <div><strong>IP Address:</strong> {selectedPrint.watermark.ipAddress}</div>
                        <div><strong>ID Documento:</strong> {selectedPrint.watermark.documentId}</div>
                        <div><strong>ID Único:</strong> {selectedPrint.watermark.uniqueId}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hashes de Verificación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Hash del Documento</label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-md">
                      <div className="font-mono text-sm text-slate-700 flex items-center">
                        <Hash className="h-4 w-4 mr-2" />
                        {selectedPrint.documentHash}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Hash de Impresión</label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-md">
                      <div className="font-mono text-sm text-slate-700 flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        {selectedPrint.printHash}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error si existe */}
                {selectedPrint.errorMessage && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Mensaje de Error</label>
                    <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="text-red-800 text-sm">{selectedPrint.errorMessage}</div>
                    </div>
                  </div>
                )}

                {/* Metadatos */}
                {selectedPrint.metadata && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Metadatos Técnicos</label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-md">
                      <pre className="text-xs text-slate-700 overflow-auto max-h-32">
                        {JSON.stringify(selectedPrint.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setSelectedPrint(null)}>
                  Cerrar
                </Button>
                {selectedPrint.status === 'completed' && (
                  <Button variant="primary" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Verificar Hash
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}