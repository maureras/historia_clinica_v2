// src/components/security/SecurityMetrics.tsx
import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  Users, 
  FileText, 
  Printer, 
  Shield, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Clock,
  Monitor,
  Eye
} from 'lucide-react'
import { Card } from '@/components/ui'
import { calculateAccessMetrics, calculatePrintMetrics } from '@/utils/securityUtils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSecurityMetrics } from '@/stores/mockSecurityStore'

interface SecurityMetricsProps {
  showDetailed?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  className?: string
}

interface MetricCardProps {
  title: string
  value: number | string
  change?: number
  changeLabel?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  trend?: 'up' | 'down' | 'stable'
  loading?: boolean
}


const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  trend,
  loading
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />
      case 'down':
        return <TrendingDown className="h-3 w-3" />
      default:
        return <Minus className="h-3 w-3" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return change && change > 0 ? 'text-red-600' : 'text-green-600'
      case 'down':
        return change && change > 0 ? 'text-green-600' : 'text-red-600'
      default:
        return 'text-slate-500'
    }
  }

  return (
    <Card variant="default" className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>

          {/* ❗ Antes era <p> con un <div> dentro; ahora usamos <div> + skeleton en <span> */}
          <div className="text-3xl font-bold text-slate-900 mb-2 leading-none">
            {loading ? (
              <span className="inline-block animate-pulse bg-slate-200 h-9 w-20 rounded" />
            ) : (
              value
            )}
          </div>

          {change !== undefined && changeLabel && (
            <p className={`text-sm flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              {Math.abs(change)}% {changeLabel}
            </p>
          )}
        </div>
        <div className={`h-12 w-12 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="h-6 w-6 text-current" />
        </div>
      </div>
    </Card>
  )
}


export default function SecurityMetrics({
  showDetailed = false,
  autoRefresh = true,
  refreshInterval = 30000,
  className = ''
}: SecurityMetricsProps) {
  const { metrics, loading, refresh } = useSecurityMetrics(refreshInterval)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [previousMetrics, setPreviousMetrics] = useState<typeof metrics>(null)

  useEffect(() => {
    if (metrics && !loading) {
      if (previousMetrics) {
        // Solo actualizar métricas anteriores si hay datos nuevos
        const hasChanged = JSON.stringify(metrics) !== JSON.stringify(previousMetrics)
        if (hasChanged) {
          setPreviousMetrics(metrics)
          setLastRefresh(new Date())
        }
      } else {
        setPreviousMetrics(metrics)
        setLastRefresh(new Date())
      }
    }
  }, [metrics, loading, previousMetrics])

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const getTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    const change = calculateChange(current, previous)
    if (Math.abs(change) < 5) return 'stable'
    return change > 0 ? 'up' : 'down'
  }

  if (!metrics) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
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
    )
  }

  const mainMetrics = [
    {
      title: 'Accesos Hoy',
      value: metrics.accessesToday,
      previousValue: previousMetrics?.accessesToday || 0,
      icon: Monitor,
      color: 'bg-blue-100 text-blue-600',
      changeLabel: 'vs ayer'
    },
    {
      title: 'Modificaciones',
      value: metrics.modificationsToday,
      previousValue: previousMetrics?.modificationsToday || 0,
      icon: FileText,
      color: 'bg-purple-100 text-purple-600',
      changeLabel: 'vs ayer'
    },
    {
      title: 'Impresiones',
      value: metrics.printsToday,
      previousValue: previousMetrics?.printsToday || 0,
      icon: Printer,
      color: 'bg-green-100 text-green-600',
      changeLabel: 'vs ayer'
    },
    {
      title: 'Alertas Activas',
      value: metrics.suspiciousActivity,
      previousValue: previousMetrics?.suspiciousActivity || 0,
      icon: AlertTriangle,
      color: 'bg-orange-100 text-orange-600',
      changeLabel: 'nuevas'
    }
  ]

  return (
    <div className={className}>
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {mainMetrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={calculateChange(metric.value, metric.previousValue)}
            changeLabel={metric.changeLabel}
            icon={metric.icon}
            color={metric.color}
            trend={getTrend(metric.value, metric.previousValue)}
            loading={loading}
          />
        ))}
      </div>

      {/* Métricas Detalladas */}
      {showDetailed && (
        <div className="space-y-6">
          {/* Estadísticas de Acceso */}
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Actividad de Acceso</h3>
              </div>
              <button
                onClick={() => refresh()}
                className="text-slate-500 hover:text-slate-700"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{metrics.totalAccesses}</div>
                <div className="text-sm text-slate-600">Total Accesos</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {metrics.totalAccesses - metrics.failedAccesses}
                </div>
                <div className="text-sm text-slate-600">Exitosos</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{metrics.failedAccesses}</div>
                <div className="text-sm text-slate-600">Fallidos</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{metrics.uniqueUsers}</div>
                <div className="text-sm text-slate-600">Usuarios Únicos</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{metrics.uniqueIPs}</div>
                <div className="text-sm text-slate-600">IPs Únicas</div>
              </div>
            </div>
          </Card>

          {/* Estadísticas de Impresión */}
          <Card variant="default" className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Printer className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Estadísticas de Impresión</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{metrics.printsToday}</div>
                <div className="text-sm text-slate-600">Hoy</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{metrics.totalPages}</div>
                <div className="text-sm text-slate-600">Páginas Totales</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">
                  {metrics.totalPages > 0 ? Math.round(metrics.totalPages / metrics.totalPrints) : 0}
                </div>
                <div className="text-sm text-slate-600">Páginas/Impresión</div>
              </div>
            </div>
          </Card>

          {/* Tendencias */}
          <Card variant="default" className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Tendencias</h3>
            </div>

            <div className="space-y-4">
              {metrics.accessTrend && metrics.accessTrend.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Accesos por Día</h4>
                  <div className="flex items-end gap-2 h-16">
                    {metrics.accessTrend.slice(-7).map((point, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-200 rounded-t"
                          style={{
                            height: `${Math.max(4, (point.value / Math.max(...metrics.accessTrend.map(p => p.value))) * 100)}%`
                          }}
                        ></div>
                        <div className="text-xs text-slate-500 mt-1">
                          {format(new Date(point.date), 'dd/MM')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {metrics.printTrend && metrics.printTrend.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Impresiones por Día</h4>
                  <div className="flex items-end gap-2 h-16">
                    {metrics.printTrend.slice(-7).map((point, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-green-200 rounded-t"
                          style={{
                            height: `${Math.max(4, (point.value / Math.max(...metrics.printTrend.map(p => p.value))) * 100)}%`
                          }}
                        ></div>
                        <div className="text-xs text-slate-500 mt-1">
                          {format(new Date(point.date), 'dd/MM')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Footer con información de actualización */}
      <div className="mt-6 text-center text-sm text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Última actualización: {format(lastRefresh, 'dd/MM/yyyy HH:mm:ss', { locale: es })}</span>
          {autoRefresh && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              Auto-actualización activa
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente compacto para mostrar en dashboards
export const SecurityMetricsCompact = ({ className = '' }: { className?: string }) => {
  const { metrics, loading } = useSecurityMetrics()

  if (!metrics || loading) {
    return (
      <Card variant="default" className={`p-4 ${className} animate-pulse`}>
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded w-32"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-8 bg-slate-200 rounded"></div>
            <div className="h-8 bg-slate-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  const hasAlerts = (metrics.suspiciousActivity ?? 0) > 0 || metrics.failedAccesses > 5

  return (
    <Card variant="default" className={`p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
          hasAlerts ? 'bg-red-100' : 'bg-green-100'
        }`}>
          {hasAlerts ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <Shield className="h-4 w-4 text-green-600" />
          )}
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
            (metrics.suspiciousActivity ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {metrics.suspiciousActivity ?? 0}
          </div>
          <div className="text-xs text-slate-500">Alertas</div>
        </div>
      </div>
    </Card>
  )
}

// Hook personalizado para métricas específicas
export const useSecurityMetricsData = () => {
  const { metrics, loading, error, refresh } = useSecurityMetrics()
  
  const getSecurityStatus = (): 'secure' | 'warning' | 'critical' => {
    if (!metrics) return 'warning'
    
    if ((metrics.suspiciousActivity ?? 0) > 0 || metrics.failedAccesses > 10) {
      return 'critical'
    }
    
    if (metrics.failedAccesses > 5) {
      return 'warning'
    }
    
    return 'secure'
  }
  
  const getActivityLevel = (): 'low' | 'normal' | 'high' => {
    if (!metrics) return 'normal'
    
    const totalActivity = metrics.accessesToday + metrics.modificationsToday + metrics.printsToday
    
    if (totalActivity < 10) return 'low'
    if (totalActivity > 100) return 'high'
    return 'normal'
  }

  return {
    metrics,
    loading,
    error,
    refresh,
    securityStatus: getSecurityStatus(),
    activityLevel: getActivityLevel(),
    hasAlerts: (metrics?.suspiciousActivity ?? 0) > 0,
    hasCriticalAlerts: (metrics?.suspiciousActivity ?? 0) > 3,
    isHealthy: getSecurityStatus() === 'secure'
  }
}