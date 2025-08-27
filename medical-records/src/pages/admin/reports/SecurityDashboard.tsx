// src/pages/admin/reports/SecurityDashboard.tsx
import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  RefreshCw, 
  Settings, 
  CheckCircle,
  Info,
  BarChart3,
  Users,
  Activity,
  Download,
  Sparkles
} from 'lucide-react'
import { Card, Button, Alert } from '@/components/ui'
import { useSecurityMetrics, useSecurityActions, useInitializeSecurity } from '@/stores/mockSecurityStore'
import SecurityMetrics from '@/components/security/SecurityMetrics'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  getOverview,
  getUsersActivity,
  getAbnormalLabs,
  type Dateish
} from '@/services/reports'

// Utils
const toISO = (d: Dateish) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10)

export default function SecurityDashboard() {
  // Mock data store (auto-refresh cada 30s)
  const { metrics, loading, error, refresh } = useSecurityMetrics(30000)
  const { regenerateData, exportReport } = useSecurityActions()
  const [showInfo, setShowInfo] = useState(true)
  useInitializeSecurity()

  // Filtros para llamadas reales al backend
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return toISO(d)
  })
  const [to, setTo] = useState(() => toISO(new Date()))

  // Datos reales del backend (overview, actividad, labs)
  const [overview, setOverview] = useState<any>(null)
  const [activity, setActivity] = useState<any>(null)
  const [labs, setLabs] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  async function load() {
    setDataLoading(true)
    setDataError(null)
    try {
      const [ov, act, lb] = await Promise.all([
        getOverview(from, to),
        getUsersActivity({ from, to }),
        getAbnormalLabs(from, to),
      ])
      setOverview(ov)
      setActivity(act)
      setLabs(lb)
    } catch (e: any) {
      // Silencia en demo si backend no responde
      setDataError(e?.message ?? 'Error al cargar datos de reportes')
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => { load() }, [from, to])

  const handleExportDashboard = async () => {
    await exportReport({
      reportType: 'access',
      format: 'pdf',
      includeMetadata: true,
      watermark: true
    })
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <Info className="h-4 w-4" />
          <div>
            <p className="font-medium">Error en el dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={refresh} variant="primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">Cargando Dashboard de Seguridad...</p>
          <p className="text-sm text-slate-600">Generando datos de demostración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Dashboard de Seguridad
          </h1>
          <p className="text-slate-600 flex items-center gap-2">
            <span>Monitoreo, auditoría y trazabilidad del sistema</span>
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              <CheckCircle className="h-3 w-3" />
              Demo Activo
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Indicador de estado */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Sistema Activo
            </div>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">
              Actualizado: {format(new Date(), 'HH:mm:ss', { locale: es })}
            </span>
          </div>
          {/* Botones de acción */}
          <Button
            variant="outline"
            size="sm"
            onClick={regenerateData}
            disabled={loading}
            title="Generar nuevos datos de demostración"
          >
            <Settings className="h-4 w-4" />
            Regenerar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportDashboard}
            disabled={loading}
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Error de datos reales (si existe) */}
      {dataError && (
        <Alert variant="warning">
          <Info className="h-4 w-4" />
          <div>
            <p className="font-medium">No se pudieron cargar datos del backend</p>
            <p className="text-sm">{dataError}</p>
          </div>
        </Alert>
      )}

      {/* Stats Cards Rápidas */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Estado Sistema</p>
                <p className="text-xl font-bold text-green-600">Seguro</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </Card>
          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pacientes</p>
                <p className="text-xl font-bold text-blue-600">{overview?.totals?.patients ?? metrics.uniqueUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Consultas (rango)</p>
                <p className="text-xl font-bold text-purple-600">{overview?.totals?.consultations ?? metrics.accessesToday}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
          <Card variant="default" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Alertas</p>
                <p className={`text-xl font-bold ${metrics.suspiciousActivity > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.suspiciousActivity || 0}
                </p>
              </div>
              <BarChart3 className={`h-8 w-8 ${metrics.suspiciousActivity > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </Card>
        </div>
      )}

      {/* SecurityMetrics Component */}
      {metrics ? (
        <SecurityMetrics 
          showDetailed={true}
          autoRefresh={true}
          refreshInterval={30000}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} variant="default" className="p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-20"></div>
                </div>
                <div className="h-12 w-12 bg-slate-200 rounded-lg"></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      
    </div>
  )
}

// Componente auxiliar para mostrar métricas rápidas
export const SecurityDashboardCompact = ({ className = '' }: { className?: string }) => {
  const { metrics, loading } = useSecurityMetrics()
  useInitializeSecurity()

  if (loading || !metrics) {
    return (
      <Card variant="default" className={`p-4 ${className} animate-pulse`}>
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded w-32"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-8 bg-slate-200 rounded"></div>
            <div className="h-8 bg-slate-200 rounded"></div>
            <div className="h-8 bg-slate-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  const hasAlerts = metrics.suspiciousActivity > 0 || metrics.failedAccesses > 5

  return (
    <Card variant="default" className={`p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
          hasAlerts ? 'bg-red-100' : 'bg-green-100'
        }`}>
          <Shield className={`h-4 w-4 ${hasAlerts ? 'text-red-600' : 'text-green-600'}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Estado de Seguridad</p>
          <p className={`text-xs ${hasAlerts ? 'text-red-600' : 'text-green-600'}`}>
            {hasAlerts ? 'Requiere atención' : 'Sistema seguro'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-lg font-bold text-slate-900">{metrics.accessesToday}</div>
          <div className="text-xs text-slate-500">Accesos</div>
        </div>

        <div>
          <div className={`text-lg font-bold ${
            hasAlerts ? 'text-red-600' : 'text-green-600'
          }`}>
            {metrics.suspiciousActivity}
          </div>
          <div className="text-xs text-slate-500">Alertas</div>
        </div>
      </div>
    </Card>
  )
}