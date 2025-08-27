// src/pages/admin/reports/SecurityConfiguration.tsx
import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Shield, 
  Bell, 
  Clock, 
  Database,
  Mail,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Lock,
  Printer,
  Eye,
  Users
} from 'lucide-react'
import { Card, Button, Alert } from '@/components/ui'
import type { AuditConfiguration } from '@/types/security'

interface SecurityConfigurationProps {
  className?: string
}

export default function SecurityConfiguration({ className = '' }: SecurityConfigurationProps) {
  const [config, setConfig] = useState<AuditConfiguration>({
    id: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    
    // Retención de datos (en días)
    accessLogRetentionDays: 2555, // 7 años por defecto
    modificationLogRetentionDays: 2555,
    printLogRetentionDays: 2555,
    
    // Alertas automáticas
    enableAutomaticAlerts: true,
    failedLoginThreshold: 5,
    suspiciousActivityThreshold: 50,
    bulkAccessThreshold: 100,
    
    // Configuración de impresión
    requirePrintReason: true,
    enableWatermark: true,
    watermarkTemplate: '{userName} - {timestamp} - {ipAddress}',
    
    // Notificaciones
    emailNotifications: true,
    adminEmails: [],
    
    // Configuración de reportes
    defaultRetentionDays: 90,
    automaticReportGeneration: false,
    reportFrequency: 'weekly'
  })
  
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newAdminEmail, setNewAdminEmail] = useState('')

  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    setLoading(true)
    try {
      // En producción, esto sería una llamada a la API
      const response = await fetch('/api/security/configuration')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateConfiguration = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (config.accessLogRetentionDays < 365) {
      newErrors.accessLogRetentionDays = 'La retención mínima recomendada es 1 año (365 días)'
    }
    
    if (config.failedLoginThreshold < 3) {
      newErrors.failedLoginThreshold = 'El umbral mínimo recomendado es 3 intentos'
    }
    
    if (config.suspiciousActivityThreshold < 10) {
      newErrors.suspiciousActivityThreshold = 'El umbral mínimo recomendado es 10 accesos'
    }
    
    if (config.emailNotifications && config.adminEmails.length === 0) {
      newErrors.adminEmails = 'Debe configurar al menos un email de administrador'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateConfiguration()) return
    
    setLoading(true)
    setSaved(false)
    
    try {
      const response = await fetch('/api/security/configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        throw new Error('Error al guardar configuración')
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
      setErrors({ general: 'Error al guardar la configuración. Inténtelo nuevamente.' })
    } finally {
      setLoading(false)
    }
  }

  const addAdminEmail = () => {
    if (newAdminEmail && !config.adminEmails.includes(newAdminEmail)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(newAdminEmail)) {
        setConfig(prev => ({
          ...prev,
          adminEmails: [...prev.adminEmails, newAdminEmail]
        }))
        setNewAdminEmail('')
      }
    }
  }

  const removeAdminEmail = (email: string) => {
    setConfig(prev => ({
      ...prev,
      adminEmails: prev.adminEmails.filter(e => e !== email)
    }))
  }

  const resetToDefaults = () => {
    if (confirm('¿Está seguro que desea restaurar la configuración por defecto?')) {
      setConfig(prev => ({
        ...prev,
        accessLogRetentionDays: 2555,
        modificationLogRetentionDays: 2555,
        printLogRetentionDays: 2555,
        enableAutomaticAlerts: true,
        failedLoginThreshold: 5,
        suspiciousActivityThreshold: 50,
        bulkAccessThreshold: 100,
        requirePrintReason: true,
        enableWatermark: true,
        emailNotifications: true,
        defaultRetentionDays: 90,
        automaticReportGeneration: false,
        reportFrequency: 'weekly'
      }))
    }
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Settings className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configuración de Seguridad</h1>
            <p className="text-slate-600">Configure las políticas de auditoría y seguridad del sistema</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Restaurar Defaults
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {saved && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <div>
            <p className="font-medium">Configuración guardada exitosamente</p>
            <p className="text-sm">Los cambios entrarán en efecto inmediatamente</p>
          </div>
        </Alert>
      )}

      {errors.general && (
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <p className="font-medium">Error al guardar</p>
            <p className="text-sm">{errors.general}</p>
          </div>
        </Alert>
      )}

      {/* Retención de Datos */}
      <Card variant="default" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Políticas de Retención</h3>
            <p className="text-sm text-slate-600">Configure cuánto tiempo se conservan los logs de auditoría</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Logs de Acceso (días)
            </label>
            <input
              type="number"
              min="30"
              max="3650"
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.accessLogRetentionDays ? 'border-red-300' : 'border-slate-300'
              }`}
              value={config.accessLogRetentionDays}
              onChange={(e) => setConfig(prev => ({ ...prev, accessLogRetentionDays: parseInt(e.target.value) || 0 }))}
            />
            {errors.accessLogRetentionDays && (
              <p className="text-sm text-red-600 mt-1">{errors.accessLogRetentionDays}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Recomendado: 2555 días (7 años)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Logs de Modificaciones (días)
            </label>
            <input
              type="number"
              min="30"
              max="3650"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={config.modificationLogRetentionDays}
              onChange={(e) => setConfig(prev => ({ ...prev, modificationLogRetentionDays: parseInt(e.target.value) || 0 }))}
            />
            <p className="text-xs text-slate-500 mt-1">Crítico: Conservar por tiempo indefinido</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Logs de Impresión (días)
            </label>
            <input
              type="number"
              min="30"
              max="3650"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={config.printLogRetentionDays}
              onChange={(e) => setConfig(prev => ({ ...prev, printLogRetentionDays: parseInt(e.target.value) || 0 }))}
            />
            <p className="text-xs text-slate-500 mt-1">Para trazabilidad legal</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <p className="text-sm text-blue-800">
              <strong>Importante:</strong> Los logs de auditoría médica deben conservarse por al menos 7 años según normativas locales.
            </p>
          </div>
        </div>
      </Card>

      {/* Alertas Automáticas */}
      <Card variant="default" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-orange-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Alertas Automáticas</h3>
            <p className="text-sm text-slate-600">Configure los umbrales para detectar actividad sospechosa</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableAlerts"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={config.enableAutomaticAlerts}
              onChange={(e) => setConfig(prev => ({ ...prev, enableAutomaticAlerts: e.target.checked }))}
            />
            <label htmlFor="enableAlerts" className="text-sm font-medium text-slate-900">
              Habilitar alertas automáticas de seguridad
            </label>
          </div>

          {config.enableAutomaticAlerts && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Intentos de Login Fallidos
                </label>
                <input
                  type="number"
                  min="3"
                  max="20"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 ${
                    errors.failedLoginThreshold ? 'border-red-300' : 'border-slate-300'
                  }`}
                  value={config.failedLoginThreshold}
                  onChange={(e) => setConfig(prev => ({ ...prev, failedLoginThreshold: parseInt(e.target.value) || 0 }))}
                />
                {errors.failedLoginThreshold && (
                  <p className="text-sm text-red-600 mt-1">{errors.failedLoginThreshold}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">Alertar después de X intentos fallidos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Actividad Sospechosa (accesos/hora)
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 ${
                    errors.suspiciousActivityThreshold ? 'border-red-300' : 'border-slate-300'
                  }`}
                  value={config.suspiciousActivityThreshold}
                  onChange={(e) => setConfig(prev => ({ ...prev, suspiciousActivityThreshold: parseInt(e.target.value) || 0 }))}
                />
                {errors.suspiciousActivityThreshold && (
                  <p className="text-sm text-red-600 mt-1">{errors.suspiciousActivityThreshold}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">Detectar accesos excesivos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Acceso Masivo de Datos
                </label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  value={config.bulkAccessThreshold}
                  onChange={(e) => setConfig(prev => ({ ...prev, bulkAccessThreshold: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-slate-500 mt-1">Alertar por acceso masivo a datos</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Configuración de Impresión */}
      <Card variant="default" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Printer className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Políticas de Impresión</h3>
            <p className="text-sm text-slate-600">Configure las reglas para impresión de documentos médicos</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="requireReason"
              className="rounded border-slate-300 text-green-600 focus:ring-green-500"
              checked={config.requirePrintReason}
              onChange={(e) => setConfig(prev => ({ ...prev, requirePrintReason: e.target.checked }))}
            />
            <label htmlFor="requireReason" className="text-sm font-medium text-slate-900">
              Requerir motivo obligatorio para imprimir
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableWatermark"
              className="rounded border-slate-300 text-green-600 focus:ring-green-500"
              checked={config.enableWatermark}
              onChange={(e) => setConfig(prev => ({ ...prev, enableWatermark: e.target.checked }))}
            />
            <label htmlFor="enableWatermark" className="text-sm font-medium text-slate-900">
              Aplicar marca de agua automáticamente
            </label>
          </div>

          {config.enableWatermark && (
            <div className="pl-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Plantilla de Marca de Agua
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500 focus:border-green-500"
                value={config.watermarkTemplate}
                onChange={(e) => setConfig(prev => ({ ...prev, watermarkTemplate: e.target.value }))}
                placeholder="{userName} - {timestamp} - {ipAddress}"
              />
              <p className="text-xs text-slate-500 mt-1">
                Variables disponibles: {'{userName}'}, {'{timestamp}'}, {'{ipAddress}'}, {'{documentId}'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Notificaciones */}
      <Card variant="default" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-5 w-5 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Notificaciones</h3>
            <p className="text-sm text-slate-600">Configure cómo y cuándo recibir notificaciones de seguridad</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="emailNotifications"
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              checked={config.emailNotifications}
              onChange={(e) => setConfig(prev => ({ ...prev, emailNotifications: e.target.checked }))}
            />
            <label htmlFor="emailNotifications" className="text-sm font-medium text-slate-900">
              Enviar notificaciones por email
            </label>
          </div>

          {config.emailNotifications && (
            <div className="pl-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Emails de Administradores
              </label>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@clinica.com"
                />
                <Button variant="outline" onClick={addAdminEmail}>
                  Agregar
                </Button>
              </div>

              {config.adminEmails.length > 0 && (
                <div className="space-y-2">
                  {config.adminEmails.map((email, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span className="text-sm text-purple-900">{email}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAdminEmail(email)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {errors.adminEmails && (
                <p className="text-sm text-red-600 mt-1">{errors.adminEmails}</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Configuración de Reportes */}
      <Card variant="default" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Eye className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Reportes Automáticos</h3>
            <p className="text-sm text-slate-600">Configure la generación automática de reportes de seguridad</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Retención Default de Filtros (días)
            </label>
            <input
              type="number"
              min="7"
              max="365"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              value={config.defaultRetentionDays}
              onChange={(e) => setConfig(prev => ({ ...prev, defaultRetentionDays: parseInt(e.target.value) || 0 }))}
            />
            <p className="text-xs text-slate-500 mt-1">Período default para consultas de reportes</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Frecuencia de Reportes
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              value={config.reportFrequency}
              onChange={(e) => setConfig(prev => ({ ...prev, reportFrequency: e.target.value as any }))}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoReports"
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={config.automaticReportGeneration}
              onChange={(e) => setConfig(prev => ({ ...prev, automaticReportGeneration: e.target.checked }))}
            />
            <label htmlFor="autoReports" className="text-sm font-medium text-slate-900">
              Generar reportes automáticamente y enviarlos por email
            </label>
          </div>
        </div>
      </Card>

      {/* Información de Seguridad */}
      <Card variant="default" className="p-6 bg-slate-50 border-slate-200">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-slate-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Información de Seguridad</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Los cambios en la configuración se registran en el log de auditoría</li>
              <li>• Solo los administradores pueden modificar estas configuraciones</li>
              <li>• Las alertas críticas se envían inmediatamente independiente de la configuración</li>
              <li>• Los logs de auditoría están protegidos contra eliminación accidental</li>
              <li>• Todas las configuraciones cumplen con estándares de seguridad médica</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}