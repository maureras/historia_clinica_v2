// src/utils/securityUtils.ts
import { format, isWithinInterval, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { 
  AccessType, 
  EntityType, 
  ModificationAction, 
  DocumentType,
  PrintUrgency,
  PrintStatus,
  AlertSeverity,
  AlertType,
  SecurityReportFilters,
  WatermarkInfo 
} from '@/types/security'

// ============================================================================
// FORMATEADORES DE TEXTO
// ============================================================================

/**
 * Formatea tipos de acceso a etiquetas legibles
 */
export const formatAccessType = (type: AccessType): string => {
  const labels: Record<AccessType, string> = {
    login: 'Inicio de sesión',
    logout: 'Cierre de sesión',
    view_patient: 'Ver paciente',
    edit_patient: 'Editar paciente',
    create_patient: 'Crear paciente',
    delete_patient: 'Eliminar paciente',
    view_medical_record: 'Ver historia clínica',
    edit_medical_record: 'Editar historia clínica',
    create_consultation: 'Crear consulta',
    edit_consultation: 'Editar consulta',
    print_document: 'Imprimir documento',
    export_data: 'Exportar datos',
    failed_login: 'Login fallido',
    unauthorized_access: 'Acceso no autorizado'
  }
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Formatea tipos de entidad a etiquetas legibles
 */
export const formatEntityType = (type: EntityType): string => {
  const labels: Record<EntityType, string> = {
    patient: 'Paciente',
    medical_record: 'Historia Clínica',
    consultation: 'Consulta',
    diagnosis: 'Diagnóstico',
    prescription: 'Prescripción',
    lab_result: 'Resultado de Laboratorio',
    vaccination: 'Vacunación',
    surgery: 'Cirugía',
    user: 'Usuario'
  }
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Formatea acciones de modificación
 */
export const formatModificationAction = (action: ModificationAction): string => {
  const labels: Record<ModificationAction, string> = {
    create: 'Crear',
    update: 'Actualizar',
    delete: 'Eliminar',
    restore: 'Restaurar'
  }
  return labels[action] || action
}

/**
 * Formatea tipos de documento
 */
export const formatDocumentType = (type: DocumentType): string => {
  const labels: Record<DocumentType, string> = {
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
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Formatea urgencia de impresión
 */
export const formatPrintUrgency = (urgency: PrintUrgency): string => {
  const labels: Record<PrintUrgency, string> = {
    low: 'Baja',
    normal: 'Normal',
    high: 'Alta',
    emergency: 'Emergencia'
  }
  return labels[urgency] || urgency
}

/**
 * Formatea estado de impresión
 */
export const formatPrintStatus = (status: PrintStatus): string => {
  const labels: Record<PrintStatus, string> = {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completado',
    failed: 'Fallido',
    cancelled: 'Cancelado'
  }
  return labels[status] || status
}

/**
 * Formatea nombres de campos técnicos a etiquetas amigables
 */
export const formatFieldName = (fieldName: string): string => {
  const fieldLabels: Record<string, string> = {
    // Campos de paciente
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    address: 'Dirección',
    dateOfBirth: 'Fecha de Nacimiento',
    gender: 'Género',
    bloodType: 'Tipo de Sangre',
    allergies: 'Alergias',
    chronicConditions: 'Condiciones Crónicas',
    
    // Campos médicos
    diagnosis: 'Diagnóstico',
    treatment: 'Tratamiento',
    medication: 'Medicamento',
    dosage: 'Dosis',
    frequency: 'Frecuencia',
    bloodPressure: 'Presión Arterial',
    bloodPressureSystolic: 'Presión Sistólica',
    bloodPressureDiastolic: 'Presión Diastólica',
    temperature: 'Temperatura',
    heartRate: 'Frecuencia Cardíaca',
    weight: 'Peso',
    height: 'Altura',
    bmi: 'IMC',
    oxygenSaturation: 'Saturación de Oxígeno',
    
    // Campos de consulta
    reason: 'Motivo de Consulta',
    symptoms: 'Síntomas',
    examination: 'Examen Físico',
    notes: 'Notas',
    followUpDate: 'Fecha de Seguimiento',
    
    // Campos de usuario
    role: 'Rol',
    speciality: 'Especialidad',
    isActive: 'Estado Activo',
    lastLogin: 'Último Acceso'
  }
  
  return fieldLabels[fieldName] || fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ')
    .trim()
}

// ============================================================================
// CLASIFICADORES DE COLOR Y ESTILO
// ============================================================================

/**
 * Obtiene el color para un tipo de acceso
 */
export const getAccessTypeColor = (type: AccessType): string => {
  if (type.includes('failed') || type.includes('unauthorized')) {
    return 'text-red-600 bg-red-50 border-red-200'
  }
  if (type.includes('create') || type.includes('edit') || type.includes('delete')) {
    return 'text-orange-600 bg-orange-50 border-orange-200'
  }
  if (type.includes('view') || type.includes('login')) {
    return 'text-blue-600 bg-blue-50 border-blue-200'
  }
  return 'text-gray-600 bg-gray-50 border-gray-200'
}

/**
 * Obtiene el color para una acción de modificación
 */
export const getModificationActionColor = (action: ModificationAction): string => {
  const colors: Record<ModificationAction, string> = {
    create: 'text-green-600 bg-green-50 border-green-200',
    update: 'text-blue-600 bg-blue-50 border-blue-200',
    delete: 'text-red-600 bg-red-50 border-red-200',
    restore: 'text-yellow-600 bg-yellow-50 border-yellow-200'
  }
  return colors[action] || 'text-gray-600 bg-gray-50 border-gray-200'
}

/**
 * Obtiene el color para urgencia de impresión
 */
export const getPrintUrgencyColor = (urgency: PrintUrgency): string => {
  const colors: Record<PrintUrgency, string> = {
    low: 'text-gray-600 bg-gray-50 border-gray-200',
    normal: 'text-blue-600 bg-blue-50 border-blue-200',
    high: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    emergency: 'text-red-600 bg-red-50 border-red-200'
  }
  return colors[urgency] || colors.normal
}

/**
 * Obtiene el color para estado de impresión
 */
export const getPrintStatusColor = (status: PrintStatus): string => {
  const colors: Record<PrintStatus, string> = {
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    processing: 'text-blue-600 bg-blue-50 border-blue-200',
    completed: 'text-green-600 bg-green-50 border-green-200',
    failed: 'text-red-600 bg-red-50 border-red-200',
    cancelled: 'text-gray-600 bg-gray-50 border-gray-200'
  }
  return colors[status] || colors.pending
}

/**
 * Obtiene el color para severidad de alerta
 */
export const getAlertSeverityColor = (severity: AlertSeverity): string => {
  const colors: Record<AlertSeverity, string> = {
    low: 'text-blue-600 bg-blue-50 border-blue-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    critical: 'text-red-600 bg-red-50 border-red-200'
  }
  return colors[severity] || colors.medium
}

// ============================================================================
// VALIDADORES
// ============================================================================

/**
 * Valida una dirección IP
 */
export const isValidIP = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * Valida filtros de reporte de seguridad
 */
export const validateSecurityFilters = (filters: SecurityReportFilters): string[] => {
  const errors: string[] = []
  
  if (filters.dateFrom && filters.dateTo) {
    if (filters.dateFrom > filters.dateTo) {
      errors.push('La fecha de inicio no puede ser posterior a la fecha de fin')
    }
  }
  
  if (filters.page && filters.page < 1) {
    errors.push('La página debe ser mayor a 0')
  }
  
  if (filters.limit && (filters.limit < 1 || filters.limit > 1000)) {
    errors.push('El límite debe estar entre 1 y 1000')
  }
  
  if (filters.ipAddress && !isValidIP(filters.ipAddress)) {
    errors.push('La dirección IP no es válida')
  }
  
  return errors
}

/**
 * Valida configuración de marca de agua
 */
export const validateWatermarkTemplate = (template: string): boolean => {
  const requiredVars = ['{userName}', '{timestamp}']
  return requiredVars.some(variable => template.includes(variable))
}

// ============================================================================
// GENERADORES DE HASH Y IDs
// ============================================================================

/**
 * Genera un ID único
 */
export const generateUniqueId = (): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${random}`.toUpperCase()
}

/**
 * Genera hash de documento
 */
export const generateDocumentHash = (content?: string): string => {
  const timestamp = Date.now()
  const contentHash = content ? btoa(content).substring(0, 8) : 'NOCONTENT'
  const random = Math.random().toString(36).substring(2, 8)
  return `DOC-${timestamp}-${contentHash}-${random}`.toUpperCase()
}

/**
 * Genera hash de impresión
 */
export const generatePrintHash = (userId: string, documentId: string): string => {
  const timestamp = Date.now()
  const userHash = btoa(userId).substring(0, 6)
  const docHash = btoa(documentId).substring(0, 6)
  const random = Math.random().toString(36).substring(2, 6)
  return `PRT-${timestamp}-${userHash}-${docHash}-${random}`.toUpperCase()
}

// ============================================================================
// FUNCIONES DE MARCA DE AGUA
// ============================================================================

/**
 * Genera información de marca de agua
 */
export const generateWatermarkInfo = (
  userId: string,
  userName: string,
  documentId?: string,
  ipAddress?: string
): WatermarkInfo => {
  const timestamp = new Date()
  const uniqueId = generateUniqueId()
  
  return {
    userId,
    userName,
    timestamp,
    ipAddress: ipAddress || 'Unknown',
    documentId: documentId || `DOC-${timestamp.getTime()}`,
    uniqueId
  }
}

/**
 * Procesa plantilla de marca de agua
 */
export const processWatermarkTemplate = (
  template: string,
  watermarkInfo: WatermarkInfo
): string => {
  let processed = template
  
  const replacements = {
    '{userName}': watermarkInfo.userName,
    '{userId}': watermarkInfo.userId,
    '{timestamp}': format(watermarkInfo.timestamp, 'dd/MM/yyyy HH:mm', { locale: es }),
    '{date}': format(watermarkInfo.timestamp, 'dd/MM/yyyy', { locale: es }),
    '{time}': format(watermarkInfo.timestamp, 'HH:mm', { locale: es }),
    '{ipAddress}': watermarkInfo.ipAddress,
    '{documentId}': watermarkInfo.documentId,
    '{uniqueId}': watermarkInfo.uniqueId
  }
  
  Object.entries(replacements).forEach(([variable, value]) => {
    processed = processed.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value)
  })
  
  return processed
}

// ============================================================================
// DETECTORES DE ACTIVIDAD SOSPECHOSA
// ============================================================================

/**
 * Detecta patrones de acceso sospechosos
 */
export const detectSuspiciousActivity = (accessLogs: any[]): {
  type: AlertType
  severity: AlertSeverity
  message: string
}[] => {
  const alerts = []
  
  // Detectar múltiples intentos fallidos
  const failedLogins = accessLogs.filter(log => 
    log.accessType === 'failed_login' &&
    isWithinInterval(parseISO(log.createdAt), {
      start: new Date(Date.now() - 3600000), // Última hora
      end: new Date()
    })
  )
  
  if (failedLogins.length >= 5) {
    alerts.push({
      type: 'multiple_failed_logins' as AlertType,
      severity: 'high' as AlertSeverity,
      message: `${failedLogins.length} intentos de login fallidos en la última hora`
    })
  }
  
  // Detectar accesos fuera de horario
  const afterHoursAccess = accessLogs.filter(log => {
    const hour = new Date(log.createdAt).getHours()
    return hour < 7 || hour > 22 // Fuera de 7 AM - 10 PM
  })
  
  if (afterHoursAccess.length > 0) {
    alerts.push({
      type: 'after_hours_access' as AlertType,
      severity: 'medium' as AlertSeverity,
      message: `${afterHoursAccess.length} accesos fuera del horario laboral`
    })
  }
  
  // Detectar acceso desde múltiples IPs
  const uniqueIPs = new Set(accessLogs.map(log => log.ipAddress))
  if (uniqueIPs.size > 3) {
    alerts.push({
      type: 'multiple_concurrent_sessions' as AlertType,
      severity: 'medium' as AlertSeverity,
      message: `Acceso desde ${uniqueIPs.size} direcciones IP diferentes`
    })
  }
  
  // Detectar acceso masivo a datos
  const dataAccess = accessLogs.filter(log => 
    log.accessType.includes('view') &&
    isWithinInterval(parseISO(log.createdAt), {
      start: new Date(Date.now() - 3600000), // Última hora
      end: new Date()
    })
  )
  
  if (dataAccess.length >= 50) {
    alerts.push({
      type: 'mass_data_access' as AlertType,
      severity: 'critical' as AlertSeverity,
      message: `${dataAccess.length} accesos a datos en la última hora`
    })
  }
  
  return alerts
}

// ============================================================================
// CALCULADORES DE MÉTRICAS
// ============================================================================

/**
 * Calcula estadísticas de acceso
 */
export const calculateAccessMetrics = (accessLogs: any[]) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  return {
    total: accessLogs.length,
    successful: accessLogs.filter(log => log.success).length,
    failed: accessLogs.filter(log => !log.success).length,
    today: accessLogs.filter(log => new Date(log.createdAt) >= today).length,
    thisWeek: accessLogs.filter(log => new Date(log.createdAt) >= thisWeek).length,
    thisMonth: accessLogs.filter(log => new Date(log.createdAt) >= thisMonth).length,
    uniqueUsers: new Set(accessLogs.map(log => log.userId)).size,
    uniqueIPs: new Set(accessLogs.map(log => log.ipAddress)).size
  }
}

/**
 * Calcula estadísticas de impresión
 */
export const calculatePrintMetrics = (printLogs: any[]) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  return {
    total: printLogs.length,
    today: printLogs.filter(log => new Date(log.createdAt) >= today).length,
    totalPages: printLogs.reduce((sum, log) => sum + (log.pageCount || 0), 0),
    byUrgency: {
      low: printLogs.filter(log => log.urgency === 'low').length,
      normal: printLogs.filter(log => log.urgency === 'normal').length,
      high: printLogs.filter(log => log.urgency === 'high').length,
      emergency: printLogs.filter(log => log.urgency === 'emergency').length
    },
    byStatus: {
      completed: printLogs.filter(log => log.status === 'completed').length,
      failed: printLogs.filter(log => log.status === 'failed').length,
      pending: printLogs.filter(log => log.status === 'pending').length
    }
  }
}

// ============================================================================
// UTILIDADES DE EXPORTACIÓN
// ============================================================================

/**
 * Prepara datos para exportación
 */
export const prepareExportData = (
  data: any[], 
  type: 'access' | 'modification' | 'print'
) => {
  switch (type) {
    case 'access':
      return data.map(log => ({
        'Usuario': `${log.user?.firstName || ''} ${log.user?.lastName || ''}`,
        'Fecha': format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }),
        'IP': log.ipAddress,
        'Tipo de Acceso': formatAccessType(log.accessType),
        'Paciente': log.patient ? `${log.patient.firstName} ${log.patient.lastName}` : 'Sistema',
        'Duración': log.sessionDuration ? `${log.sessionDuration} min` : 'N/A',
        'Estado': log.success ? 'Exitoso' : 'Fallido',
        'Error': log.errorMessage || ''
      }))
      
    case 'modification':
      return data.map(log => ({
        'Usuario': `${log.user?.firstName || ''} ${log.user?.lastName || ''}`,
        'Fecha': format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }),
        'Paciente': log.patient ? `${log.patient.firstName} ${log.patient.lastName}` : 'Sistema',
        'Entidad': formatEntityType(log.entityType),
        'Acción': formatModificationAction(log.action),
        'Campo': formatFieldName(log.fieldName),
        'Valor Anterior': log.previousValue || '',
        'Valor Nuevo': log.newValue || '',
        'Motivo': log.reason || '',
        'IP': log.ipAddress
      }))
      
    case 'print':
      return data.map(log => ({
        'Usuario': `${log.user?.firstName || ''} ${log.user?.lastName || ''}`,
        'Fecha': format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }),
        'Paciente': log.patient ? `${log.patient.firstName} ${log.patient.lastName}` : 'N/A',
        'Documento': log.documentTitle,
        'Tipo': formatDocumentType(log.documentType),
        'Páginas': log.pageCount,
        'Motivo': log.reason,
        'Urgencia': formatPrintUrgency(log.urgency),
        'Estado': formatPrintStatus(log.status),
        'IP': log.ipAddress,
        'Hash Documento': log.documentHash,
        'Hash Impresión': log.printHash
      }))
      
    default:
      return data
  }
}

// ============================================================================
// UTILIDADES DE FECHA Y TIEMPO
// ============================================================================

/**
 * Obtiene rangos de fecha predefinidos
 */
export const getDateRanges = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  
  return {
    today: { start: today, end: now, label: 'Hoy' },
    yesterday: { start: yesterday, end: today, label: 'Ayer' },
    thisWeek: { start: thisWeek, end: now, label: 'Últimos 7 días' },
    thisMonth: { start: thisMonth, end: now, label: 'Este mes' },
    last30Days: { start: last30Days, end: now, label: 'Últimos 30 días' },
    last90Days: { start: last90Days, end: now, label: 'Últimos 90 días' }
  }
}

/**
 * Verifica si una fecha está en horario laboral
 */
export const isWorkingHours = (date: Date): boolean => {
  const hour = date.getHours()
  const day = date.getDay() // 0 = domingo, 6 = sábado
  
  // Lunes a viernes, 7 AM a 10 PM
  return day >= 1 && day <= 5 && hour >= 7 && hour <= 22
}

/**
 * Calcula la duración entre dos fechas en formato legible
 */
export const calculateDuration = (start: Date, end: Date): string => {
  const diffMs = end.getTime() - start.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  
  if (diffMinutes < 1) return 'Menos de 1 min'
  if (diffMinutes < 60) return `${diffMinutes} min`
  
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  
  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
  }
  
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

// Exportación por defecto para facilitar importación
export default {
  formatAccessType,
  formatEntityType,
  formatModificationAction,
  formatDocumentType,
  formatFieldName,
  getAccessTypeColor,
  getModificationActionColor,
  getPrintUrgencyColor,
  getPrintStatusColor,
  getAlertSeverityColor,
  validateSecurityFilters,
  generateUniqueId,
  generateDocumentHash,
  generatePrintHash,
  generateWatermarkInfo,
  processWatermarkTemplate,
  detectSuspiciousActivity,
  calculateAccessMetrics,
  calculatePrintMetrics,
  prepareExportData,
  getDateRanges,
  isWorkingHours,
  calculateDuration
}