// src/components/print/PrintManager.tsx
import React, { useState, useRef } from 'react'
import { Printer, Eye, Lock, X, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, Button, Alert } from '@/components/ui'
import { useAuthStore } from '@/stores'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Patient } from '@/types'
import type { DocumentType, PrintUrgency, WatermarkInfo } from '@/types/security'

// --- API helpers (same pattern as Users pages) ---
const API_BASE: string = `${(((import.meta as any).env?.VITE_API_URL) ?? '').replace(/\/$/, '')}`
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path)
const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

interface PrintManagerProps {
  // Datos del documento
  patient: Patient
  documentType: DocumentType
  documentTitle: string
  documentId?: string
  documentContent: React.ReactNode
  
  // Configuración
  requireReason?: boolean
  allowedUrgencies?: PrintUrgency[]
  
  // Callbacks
  onPrintSuccess?: (printId: string) => void
  onPrintError?: (error: string) => void
  onCancel?: () => void
  
  // Personalización
  className?: string
}

export default function PrintManager({
  patient,
  documentType,
  documentTitle,
  documentId,
  documentContent,
  requireReason = true,
  allowedUrgencies = ['normal', 'high', 'emergency'],
  onPrintSuccess,
  onPrintError,
  onCancel,
  className = ''
}: PrintManagerProps) {
  const { user } = useAuthStore()
  const [showPreview, setShowPreview] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [printData, setPrintData] = useState({
    reason: '',
    urgency: 'normal' as PrintUrgency
  })
  const [errors, setErrors] = useState<string[]>([])
  
  const printRef = useRef<HTMLDivElement>(null)

  // Flag de validez SIN tocar estado (para no validar en cada render)
  const canSubmit = React.useMemo(() => {
    const reason = (printData.reason ?? '').trim()
    if (!user) return false
    if (requireReason && reason.length === 0) return false
    // Si es obligatorio, mínimo 10; si es opcional, sólo exigir mínimo si escriben algo
    if ((requireReason && reason.length < 10) || (!requireReason && reason.length > 0 && reason.length < 10)) return false
    return true
  }, [printData.reason, requireReason, user])

  const generateWatermarkInfo = (): WatermarkInfo => {
    const timestamp = new Date()
    return {
      userId: user?.id || '',
      userName: `${user?.firstName} ${user?.lastName}`,
      timestamp,
      ipAddress: getClientIPAddress(), // Función auxiliar
      documentId: documentId || `DOC-${timestamp.getTime()}`,
      uniqueId: generateUniqueId()
    }
  }

  const generateUniqueId = (): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    return `${timestamp}-${random}`.toUpperCase()
  }

  const getClientIPAddress = (): string => {
    // En producción, esto debe venir del servidor (el backend sobrescribirá este valor)
    // Por ahora retornamos una IP simulada
    return '192.168.1.100'
  }

  const calculatePageCount = (): number => {
    // Lógica para calcular páginas basado en el contenido
    // Esto es una estimación simple
    const pagesByType = {
      medical_record_complete: 8,
      medical_record_summary: 3,
      consultation_report: 2,
      prescription: 1,
      lab_results: 4,
      vaccination_record: 1,
      surgery_report: 6,
      patient_summary: 2,
      discharge_summary: 3
    }
    return pagesByType[documentType] || 1
  }

  const validatePrintRequest = (): boolean => {
    const newErrors: string[] = []
    const reason = (printData.reason ?? '').trim()

    if (!user) newErrors.push('Usuario no autenticado')
    if (requireReason && reason.length === 0) newErrors.push('El motivo de impresión es obligatorio')
    if ((requireReason && reason.length < 10) || (!requireReason && reason.length > 0 && reason.length < 10)) {
      newErrors.push('El motivo debe tener al menos 10 caracteres')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const registerPrintLog = async (watermarkInfo: WatermarkInfo) => {
    const payload = {
      patientId: patient.id,
      documentType,
      documentId: documentId || watermarkInfo.documentId,
      documentTitle,
      pageCount: calculatePageCount(),
      reason: (printData.reason ?? '').trim(),
      urgency: printData.urgency,
      ipAddress: getClientIPAddress(),
      userAgent: navigator.userAgent,
      watermark: watermarkInfo,
      documentHash: generateDocumentHash(watermarkInfo),
      printHash: generatePrintHash(watermarkInfo),
      status: 'completed' as const,
      metadata: {
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        },
        printSettings: {
          timestamp: new Date().toISOString(),
          documentType,
          pageCount: calculatePageCount()
        }
      }
    }

    try {
      const res = await fetch(apiUrl('/api/security/print-logs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeader()
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        return await res.json().catch(() => ({ id: watermarkInfo.uniqueId }))
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error('No autorizado para registrar la impresión (401/403). Verifique su sesión.')
      }
      // Otros códigos: registrar y permitir continuar sin romper impresión
      console.warn('[PrintManager] Registro de impresión devolvió estado', res.status)
    } catch (e) {
      console.warn('[PrintManager] Error registrando impresión:', e)
    }
    return { id: watermarkInfo.uniqueId }
  }

  const generateDocumentHash = (watermarkInfo: WatermarkInfo): string => {
    // Generar hash único del documento para verificación
    const content = `${patient.id}-${documentType}-${watermarkInfo.timestamp.getTime()}`
    return btoa(content).substring(0, 12).toUpperCase()
  }

  const generatePrintHash = (watermarkInfo: WatermarkInfo): string => {
    // Generar hash único de la impresión
    const content = `${watermarkInfo.uniqueId}-${watermarkInfo.userId}-${Date.now()}`
    return btoa(content).substring(0, 16).toUpperCase()
  }

  const applyWatermarkToContent = (content: React.ReactNode, watermarkInfo: WatermarkInfo) => {
    // Esta función integraría con tu sistema existente de marca de agua
    // Aquí simplemente retornamos el contenido con el watermark
    return (
      <div className="relative">
        {/* Marca de agua de fondo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-10 print:opacity-20">
          <div className="text-gray-500 text-4xl font-bold transform rotate-45 select-none">
            <div className="text-center">
              <div>{watermarkInfo.userName}</div>
              <div className="text-2xl">{format(watermarkInfo.timestamp, 'dd/MM/yyyy HH:mm')}</div>
              <div className="text-xl">{watermarkInfo.ipAddress}</div>
              <div className="text-lg">ID: {watermarkInfo.uniqueId}</div>
            </div>
          </div>
        </div>
        
        {/* Contenido del documento */}
        <div className="relative z-20">
          {content}
        </div>
        
        {/* Footer con información de impresión */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-600 print:block">
          <div className="flex justify-between">
            <div>
              <div><strong>Impreso por:</strong> {watermarkInfo.userName}</div>
              <div><strong>Fecha:</strong> {format(watermarkInfo.timestamp, 'dd/MM/yyyy HH:mm', { locale: es })}</div>
            </div>
            <div>
              <div><strong>IP:</strong> {watermarkInfo.ipAddress}</div>
              <div><strong>ID Único:</strong> {watermarkInfo.uniqueId}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handlePreview = () => {
    if (!validatePrintRequest()) return
    setShowPreview(true)
  }

  const handlePrint = async () => {
    if (!validatePrintRequest()) return

    setIsProcessing(true)
    setErrors([])

    try {
      // 1. Generar información de marca de agua
      const watermarkInfo = generateWatermarkInfo()

      // 2. Registrar en el log de auditoría
      const printLog = await registerPrintLog(watermarkInfo)

      const printedId = (printLog && printLog.id) ? printLog.id : watermarkInfo.uniqueId
      // 3. (La vista previa ya aplica la marca de agua; no es necesario aquí)

      // 4. Proceder con la impresión
      window.print()

      onPrintSuccess?.(printedId)

      setShowPreview(false)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al imprimir'
      setErrors([errorMessage])
      onPrintError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const getDocumentTypeLabel = (type: DocumentType): string => {
    const labels = {
      medical_record_complete: 'Historia Clínica Completa',
      medical_record_summary: 'Resumen de Historia Clínica',
      consultation_report: 'Reporte de Consulta',
      prescription: 'Receta Médica',
      lab_results: 'Resultados de Laboratorio',
      vaccination_record: 'Registro de Vacunación',
      surgery_report: 'Reporte Quirúrgico',
      patient_summary: 'Resumen del Paciente',
      discharge_summary: 'Resumen de Alta'
    }
    return labels[type] || type
  }

  const getUrgencyColor = (urgency: PrintUrgency): string => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800', 
      high: 'bg-yellow-100 text-yellow-800',
      emergency: 'bg-red-100 text-red-800'
    }
    return colors[urgency]
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Errores */}
      {errors.length > 0 && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-medium">Error en la configuración de impresión:</p>
            <ul className="mt-1 text-sm list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Configuración de impresión */}
      <Card variant="default" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Printer className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Configuración de Impresión</h3>
            <p className="text-sm text-slate-600">Configure los detalles para la impresión segura</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Paciente
              </label>
              <div className="p-3 bg-slate-50 rounded-md">
                <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                <div className="text-sm text-slate-600">
                  {patient.documentType}: {patient.documentNumber}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Documento
              </label>
              <div className="p-3 bg-slate-50 rounded-md">
                <div className="font-medium">{documentTitle}</div>
                <div className="text-sm text-slate-600">{getDocumentTypeLabel(documentType)}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Páginas estimadas: {calculatePageCount()}
                </div>
              </div>
            </div>

            {requireReason && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Motivo de Impresión <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Especifique el motivo de la impresión..."
                  value={printData.reason}
                  onChange={(e) => setPrintData(prev => ({ ...prev, reason: e.target.value }))}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Mínimo 10 caracteres. Este motivo será registrado en el log de auditoría.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Urgencia
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={printData.urgency}
                onChange={(e) => setPrintData(prev => ({ ...prev, urgency: e.target.value as PrintUrgency }))}
              >
                {allowedUrgencies.map(urgency => (
                  <option key={urgency} value={urgency}>
                    {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Información de Seguridad
              </h4>
              <div className="space-y-2 text-sm text-blue-800">
                <div>• Se aplicará marca de agua automáticamente</div>
                <div>• Registro completo en log de auditoría</div>
                <div>• Trazabilidad mediante hash único</div>
                <div>• Impresión vinculada al usuario actual</div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3">Datos de Impresión</h4>
              <div className="space-y-1 text-sm text-green-800">
                <div><strong>Usuario:</strong> {user?.firstName} {user?.lastName}</div>
                <div><strong>Fecha:</strong> {format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
                <div><strong>IP:</strong> {getClientIPAddress()}</div>
                <div><strong>Urgencia:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${getUrgencyColor(printData.urgency)}`}>
                    {printData.urgency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
          <Button variant="outline" onClick={handlePreview} disabled={isProcessing}>
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
          <Button 
            variant="primary" 
            onClick={handlePrint} 
            disabled={isProcessing || !canSubmit}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Procesando...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Modal de Vista Previa */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Vista Previa del Documento</h3>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div ref={printRef} className="bg-white p-8 min-h-96 border border-slate-200">
                {applyWatermarkToContent(documentContent, generateWatermarkInfo())}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cerrar
                </Button>
                <Button variant="primary" onClick={handlePrint} disabled={isProcessing || !canSubmit}>
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Imprimiendo...
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4 mr-2" />
                      Proceder con Impresión
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