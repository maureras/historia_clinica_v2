// src/components/security/SecurityAlerts.tsx
import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Shield, 
  X, 
  CheckCircle, 
  Clock,
  User,
  Monitor,
  FileText,
  Printer,
  Eye,
  MoreVertical
} from 'lucide-react'
import { Card, Button, Alert } from '@/components/ui'
import { useSecurityActions, useSecurityStore, useInitializeSecurity } from '@/stores/mockSecurityStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { SecurityAlert, AlertType, AlertSeverity, AlertStatus } from '@/types/security'

interface SecurityAlertsProps {
  maxAlerts?: number
  showControls?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  className?: string
}

export default function SecurityAlerts({
  maxAlerts = 10,
  showControls = true,
  autoRefresh = true,
  refreshInterval = 30000, // 30 segundos
  className = ''
}: SecurityAlertsProps) {
  useInitializeSecurity()
  // Acciones desde el mock store (algunas pueden no existir según la versión del store)
  const actions = useSecurityActions() as any
  const { regenerateData } = actions
  // Elegimos una función de recarga disponible: loadAlerts si existe; si no, usamos regenerateData; si no, un no-op
  const loadAlerts: () => Promise<void> =
    (typeof actions.loadAlerts === 'function' && actions.loadAlerts)
    || (typeof regenerateData === 'function' && (async () => { await regenerateData() }))
    || (async () => {})

  const resolveAlert: ((id: string, resolution: string) => Promise<void>) | undefined = actions.resolveAlert
  const markAlertAsFalsePositive: ((id: string) => Promise<void>) | undefined = actions.markAlertAsFalsePositive

  // Seleccionamos alertas desde el estado base del store
  const alerts = (useSecurityStore((s: any) => s.alerts) || []) as SecurityAlert[]
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null)
  const [showResolutionModal, setShowResolutionModal] = useState(false)
  const [resolutionText, setResolutionText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAlerts()
    if (autoRefresh) {
      const interval = setInterval(() => { loadAlerts() }, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval]) // loadAlerts es estable por cierre

  const getAlertIcon = (type: AlertType) => {
    const icons = {
      multiple_failed_logins: Shield,
      suspicious_ip: Monitor,
      unusual_access_pattern: Clock,
      unauthorized_modification: FileText,
      mass_data_access: User,
      after_hours_access: Clock,
      multiple_concurrent_sessions: User,
      bulk_print_activity: Printer
    }
    return icons[type] || AlertTriangle
  }

  const getAlertColor = (severity: AlertSeverity) => {
    const colors = {
      low: 'border-l-blue-500 bg-blue-50',
      medium: 'border-l-yellow-500 bg-yellow-50',
      high: 'border-l-orange-500 bg-orange-50',
      critical: 'border-l-red-500 bg-red-50'
    }
    return colors[severity] || colors.medium
  }

  const getStatusBadge = (status: AlertStatus) => {
    const badges = {
      active: 'bg-red-100 text-red-800',
      investigating: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      false_positive: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || badges.active
  }

  const getStatusLabel = (status: AlertStatus) => {
    const labels = {
      active: 'Activa',
      investigating: 'Investigando',
      resolved: 'Resuelta',
      false_positive: 'Falso Positivo'
    }
    return labels[status] || status
  }

  const getTypeLabel = (type: AlertType) => {
    const labels = {
      multiple_failed_logins: 'Múltiples logins fallidos',
      suspicious_ip: 'IP sospechosa',
      unusual_access_pattern: 'Patrón de acceso inusual',
      unauthorized_modification: 'Modificación no autorizada',
      mass_data_access: 'Acceso masivo a datos',
      after_hours_access: 'Acceso fuera de horario',
      multiple_concurrent_sessions: 'Sesiones concurrentes múltiples',
      bulk_print_activity: 'Actividad masiva de impresión'
    }
    return labels[type] || type
  }

  const handleResolveAlert = async () => {
    if (!selectedAlert || !resolutionText.trim()) return
    
    if (typeof resolveAlert !== 'function') {
      console.warn('resolveAlert no está disponible en el mockSecurityStore; se omite la acción.')
      setShowResolutionModal(false)
      setSelectedAlert(null)
      setResolutionText('')
      return
    }

    setLoading(true)
    try {
      await resolveAlert(selectedAlert.id, resolutionText)
      setShowResolutionModal(false)
      setSelectedAlert(null)
      setResolutionText('')
      await loadAlerts() // Recargar alertas
    } catch (error) {
      console.error('Error al resolver alerta:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsFalsePositive = async (alertId: string) => {
    setLoading(true)
    try {
      if (typeof markAlertAsFalsePositive === 'function') {
        await markAlertAsFalsePositive(alertId)
        await loadAlerts() // Recargar alertas
      } else {
        console.warn('markAlertAsFalsePositive no está disponible en el mockSecurityStore; se omite la acción.')
      }
    } catch (error) {
      console.error('Error al marcar como falso positivo:', error)
    } finally {
      setLoading(false)
    }
  }

  const activeAlerts = alerts.filter((alert: SecurityAlert) => alert.status === 'active')
  const displayAlerts = alerts.slice(0, maxAlerts)

  if (alerts.length === 0) {
    return (
      <Card variant="default" className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No hay alertas activas</h3>
          <p className="text-slate-600">El sistema está funcionando normalmente</p>
        </div>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Alertas de Seguridad</h3>
            <p className="text-sm text-slate-600">
              {activeAlerts.length} alertas activas de {alerts.length} totales
            </p>
          </div>
        </div>
        {showControls && (
          <Button variant="outline" size="sm" onClick={() => loadAlerts()}>
            <Eye className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        )}
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-4">
       {displayAlerts.map((alert: SecurityAlert) => {
          const AlertIcon = getAlertIcon(alert.type)
          return (
            <Card 
              key={alert.id} 
              variant="default" 
              className={`border-l-4 ${getAlertColor(alert.severity)} transition-all hover:shadow-md`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      alert.severity === 'critical' ? 'bg-red-100' : 
                      alert.severity === 'high' ? 'bg-orange-100' :
                      alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <AlertIcon className={`h-4 w-4 ${
                        alert.severity === 'critical' ? 'text-red-600' : 
                        alert.severity === 'high' ? 'text-orange-600' :
                        alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {alert.title}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(alert.status)}`}>
                          {getStatusLabel(alert.status)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                        {alert.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(alert.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                        {alert.ipAddress && (
                          <span className="flex items-center gap-1">
                            <Monitor className="h-3 w-3" />
                            {alert.ipAddress}
                          </span>
                        )}
                        <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100">
                          {getTypeLabel(alert.type)}
                        </span>
                      </div>
                      
                      {alert.status === 'resolved' && alert.resolution && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                          <strong>Resolución:</strong> {alert.resolution}
                          {alert.resolvedAt && (
                            <div className="text-green-600 mt-1">
                              Resuelto el {format(new Date(alert.resolvedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  {showControls && alert.status === 'active' && (
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAlert(alert)
                          setShowResolutionModal(true)
                        }}
                        disabled={loading}
                      >
                        Resolver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsFalsePositive(alert.id)}
                        disabled={loading}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Falso +
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Ver más alertas */}
      {alerts.length > maxAlerts && (
        <div className="text-center mt-6">
          <Button variant="outline">
            Ver {alerts.length - maxAlerts} alertas más
          </Button>
        </div>
      )}

      {/* Modal de Resolución */}
      {showResolutionModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Resolver Alerta</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowResolutionModal(false)
                    setSelectedAlert(null)
                    setResolutionText('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mb-4">
                <div className="p-3 bg-slate-50 rounded-md mb-4">
                  <h4 className="font-medium text-slate-900">{selectedAlert.title}</h4>
                  <p className="text-sm text-slate-600 mt-1">{selectedAlert.description}</p>
                </div>
                
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción de la resolución
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Describe cómo se resolvió esta alerta de seguridad..."
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Esta información se guardará en el registro de auditoría
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResolutionModal(false)
                    setSelectedAlert(null)
                    setResolutionText('')
                  }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleResolveAlert}
                  disabled={!resolutionText.trim() || loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Resolviendo...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Resuelta
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook personalizado para usar alertas más fácilmente
export const useSecurityAlertsWidget = (options?: {
  maxAlerts?: number
  autoRefresh?: boolean
  refreshInterval?: number
}) => {
  const actions = useSecurityActions() as any
  const loadAlerts: () => Promise<void> =
    (typeof actions.loadAlerts === 'function' && actions.loadAlerts)
    || (typeof actions.regenerateData === 'function' && (async () => { await actions.regenerateData() }))
    || (async () => {})

  const alerts = (useSecurityStore((s: any) => s.alerts) || []) as SecurityAlert[]
  
  const activeAlerts = alerts.filter((alert: SecurityAlert) => alert.status === 'active')
  const criticalAlerts = activeAlerts.filter((alert: SecurityAlert) => alert.severity === 'critical')
  const highAlerts = activeAlerts.filter((alert: SecurityAlert) => alert.severity === 'high')

  useEffect(() => {
    loadAlerts()
  
    if (options?.autoRefresh !== false) {
      const interval = setInterval(loadAlerts, options?.refreshInterval || 30000)
      return () => clearInterval(interval)
    }
  }, [options?.autoRefresh, options?.refreshInterval])
  
  return {
    alerts: alerts.slice(0, options?.maxAlerts || 10),
    activeAlerts,
    criticalAlerts,
    highAlerts,
    totalAlerts: alerts.length,
    hasActiveAlerts: activeAlerts.length > 0,
    hasCriticalAlerts: criticalAlerts.length > 0,
    refresh: loadAlerts
  }
}

// Componente compacto para el dashboard principal
export const SecurityAlertsWidget = ({ className = '' }: { className?: string }) => {
  const { 
    activeAlerts, 
    criticalAlerts, 
    hasCriticalAlerts, 
    hasActiveAlerts 
  } = useSecurityAlertsWidget({ maxAlerts: 5 })

  if (!hasActiveAlerts) {
    return (
      <Card variant="default" className={`p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Sistema Seguro</p>
            <p className="text-xs text-slate-500">No hay alertas activas</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="default" className={`p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
          hasCriticalAlerts ? 'bg-red-100' : 'bg-orange-100'
        }`}>
          <AlertTriangle className={`h-4 w-4 ${
            hasCriticalAlerts ? 'text-red-600' : 'text-orange-600'
          }`} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">
            {activeAlerts.length} Alertas de Seguridad
          </p>
          {criticalAlerts.length > 0 && (
            <p className="text-xs text-red-600">
              {criticalAlerts.length} críticas requieren atención inmediata
            </p>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
     {activeAlerts.slice(0, 3).map((alert: SecurityAlert) => (
          <div key={alert.id} className="text-xs p-2 bg-slate-50 rounded">
            <div className="font-medium text-slate-900 truncate">{alert.title}</div>
            <div className="text-slate-600 truncate">{alert.description}</div>
          </div>
        ))}
      </div>
      
      {activeAlerts.length > 3 && (
        <p className="text-xs text-slate-500 mt-2">
          +{activeAlerts.length - 3} alertas más
        </p>
      )}
    </Card>
  )
}