// src/types/security.ts
import { BaseEntity, User, Patient } from './index'

// ============================================================================
// TIPOS DE AUDITORÍA Y SEGURIDAD
// ============================================================================

export interface AccessLog extends BaseEntity {
  userId: string
  user?: User
  patientId?: string
  patient?: Patient
  
  // Información del acceso
  accessType: AccessType
  ipAddress: string
  userAgent: string
  sessionDuration?: number // minutos
  
  // Detalles
  action: string
  resource: string
  method: string
  endpoint?: string
  
  // Estado
  success: boolean
  errorMessage?: string
  
  // Metadatos
  metadata?: Record<string, any>
}

export const AccessType = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  VIEW_PATIENT: 'view_patient',
  EDIT_PATIENT: 'edit_patient',
  CREATE_PATIENT: 'create_patient',
  DELETE_PATIENT: 'delete_patient',
  VIEW_MEDICAL_RECORD: 'view_medical_record',
  EDIT_MEDICAL_RECORD: 'edit_medical_record',
  CREATE_CONSULTATION: 'create_consultation',
  EDIT_CONSULTATION: 'edit_consultation',
  PRINT_DOCUMENT: 'print_document',
  EXPORT_DATA: 'export_data',
  FAILED_LOGIN: 'failed_login',
  UNAUTHORIZED_ACCESS: 'unauthorized_access'
} as const

export type AccessType = typeof AccessType[keyof typeof AccessType]

// ============================================================================
// REGISTRO DE MODIFICACIONES
// ============================================================================

export interface ModificationLog extends BaseEntity {
  userId: string
  user?: User
  patientId: string
  patient?: Patient
  
  // Información de la modificación
  entityType: EntityType
  entityId: string
  action: ModificationAction
  
  // Cambios
  fieldName: string
  previousValue: string | null
  newValue: string | null
  
  // Contexto
  reason?: string
  ipAddress: string
  userAgent: string
  
  // Metadatos
  metadata?: Record<string, any>
}

export const EntityType = {
  PATIENT: 'patient',
  MEDICAL_RECORD: 'medical_record',
  CONSULTATION: 'consultation',
  DIAGNOSIS: 'diagnosis',
  PRESCRIPTION: 'prescription',
  LAB_RESULT: 'lab_result',
  VACCINATION: 'vaccination',
  SURGERY: 'surgery',
  USER: 'user'
} as const

export type EntityType = typeof EntityType[keyof typeof EntityType]

export const ModificationAction = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  RESTORE: 'restore'
} as const

export type ModificationAction = typeof ModificationAction[keyof typeof ModificationAction]

// ============================================================================
// REGISTRO DE IMPRESIONES
// ============================================================================

export interface PrintLog extends BaseEntity {
  userId: string
  user?: User
  patientId: string
  patient?: Patient
  
  // Información del documento
  documentType: DocumentType
  documentId?: string
  documentTitle: string
  pageCount: number
  
  // Motivo y contexto
  reason: string
  urgency: PrintUrgency
  
  // Información técnica
  ipAddress: string
  userAgent: string
  printerName?: string
  
  // Marca de agua
  watermark: WatermarkInfo
  
  // Hash para verificación
  documentHash: string
  printHash: string
  
  // Estado
  status: PrintStatus
  errorMessage?: string
  
  // Metadatos
  metadata?: Record<string, any>
}

export const DocumentType = {
  MEDICAL_RECORD_COMPLETE: 'medical_record_complete',
  MEDICAL_RECORD_SUMMARY: 'medical_record_summary',
  CONSULTATION_REPORT: 'consultation_report',
  PRESCRIPTION: 'prescription',
  LAB_RESULTS: 'lab_results',
  VACCINATION_RECORD: 'vaccination_record',
  SURGERY_REPORT: 'surgery_report',
  PATIENT_SUMMARY: 'patient_summary',
  DISCHARGE_SUMMARY: 'discharge_summary'
} as const

export type DocumentType = typeof DocumentType[keyof typeof DocumentType]

export const PrintUrgency = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  EMERGENCY: 'emergency'
} as const

export type PrintUrgency = typeof PrintUrgency[keyof typeof PrintUrgency]

export const PrintStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const

export type PrintStatus = typeof PrintStatus[keyof typeof PrintStatus]

export interface WatermarkInfo {
  userId: string
  userName: string
  timestamp: Date
  ipAddress: string
  documentId: string
  uniqueId: string
}

// ============================================================================
// FILTROS PARA REPORTES
// ============================================================================

export interface SecurityReportFilters {
  // Filtros temporales
  dateFrom?: Date
  dateTo?: Date
  
  // Filtros de usuario
  userId?: string
  userRole?: string
  
  // Filtros de paciente
  patientId?: string
  
  // Filtros específicos por tipo de reporte
  accessType?: AccessType
  success?: boolean
  ipAddress?: string
  
  // Modificaciones
  entityType?: EntityType
  action?: ModificationAction
  fieldName?: string
  
  // Impresiones
  documentType?: DocumentType
  reason?: string
  urgency?: PrintUrgency
  status?: PrintStatus
  
  // Paginación
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// ESTADÍSTICAS Y MÉTRICAS
// ============================================================================

export interface SecurityMetrics {
  // Accesos
  totalAccesses: number
  failedAccesses: number
  uniqueUsers: number
  uniqueIPs: number
  
  // Por período
  accessesToday: number
  accessesThisWeek: number
  accessesThisMonth: number
  
  // Modificaciones
  totalModifications: number
  modificationsToday: number
  
  // Impresiones
  totalPrints: number
  printsToday: number
  totalPages: number
  
  // Alertas
  suspiciousActivity: number
  failedLoginAttempts: number
  
  // Tendencias
  accessTrend: TrendData[]
  modificationTrend: TrendData[]
  printTrend: TrendData[]
}

export interface TrendData {
  date: string
  value: number
  label?: string
}

// ============================================================================
// ALERTAS DE SEGURIDAD
// ============================================================================

export interface SecurityAlert extends BaseEntity {
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  
  // Contexto
  userId?: string
  ipAddress?: string
  resource?: string
  
  // Estado
  status: AlertStatus
  resolvedBy?: string
  resolvedAt?: Date
  resolution?: string
  
  // Datos adicionales
  metadata?: Record<string, any>
  relatedLogs?: string[] // IDs de logs relacionados
}

export const AlertType = {
  MULTIPLE_FAILED_LOGINS: 'multiple_failed_logins',
  SUSPICIOUS_IP: 'suspicious_ip',
  UNUSUAL_ACCESS_PATTERN: 'unusual_access_pattern',
  UNAUTHORIZED_MODIFICATION: 'unauthorized_modification',
  MASS_DATA_ACCESS: 'mass_data_access',
  AFTER_HOURS_ACCESS: 'after_hours_access',
  MULTIPLE_CONCURRENT_SESSIONS: 'multiple_concurrent_sessions',
  BULK_PRINT_ACTIVITY: 'bulk_print_activity'
} as const

export type AlertType = typeof AlertType[keyof typeof AlertType]

export const AlertSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

export type AlertSeverity = typeof AlertSeverity[keyof typeof AlertSeverity]

export const AlertStatus = {
  ACTIVE: 'active',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  FALSE_POSITIVE: 'false_positive'
} as const

export type AlertStatus = typeof AlertStatus[keyof typeof AlertStatus]

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

export interface SecurityReportResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: SecurityReportFilters
  metrics?: SecurityMetrics
}

export interface ExportRequest {
  reportType: 'access' | 'modification' | 'print'
  format: 'excel' | 'pdf' | 'csv'
  filters: SecurityReportFilters
  includeMetadata: boolean
  watermark: boolean
}

// ============================================================================
// CONFIGURACIÓN DE AUDITORÍA
// ============================================================================

export interface AuditConfiguration extends BaseEntity {
  // Retención de datos
  accessLogRetentionDays: number
  modificationLogRetentionDays: number
  printLogRetentionDays: number
  
  // Alertas automáticas
  enableAutomaticAlerts: boolean
  failedLoginThreshold: number
  suspiciousActivityThreshold: number
  bulkAccessThreshold: number
  
  // Configuración de impresión
  requirePrintReason: boolean
  enableWatermark: boolean
  watermarkTemplate: string
  
  // Notificaciones
  emailNotifications: boolean
  adminEmails: string[]
  
  // Configuración de reportes
  defaultRetentionDays: number
  automaticReportGeneration: boolean
  reportFrequency: 'daily' | 'weekly' | 'monthly'
}

// ============================================================================
// UTILIDADES
// ============================================================================

export type SecurityReportType = 'access' | 'modification' | 'print' | 'alerts'

export interface SecurityDashboardData {
  metrics: SecurityMetrics
  recentAlerts: SecurityAlert[]
  recentAccesses: AccessLog[]
  recentModifications: ModificationLog[]
  recentPrints: PrintLog[]
}

// Re-exports
export type AccessLogInput = Omit<AccessLog, 'id' | 'createdAt' | 'updatedAt'>
export type ModificationLogInput = Omit<ModificationLog, 'id' | 'createdAt' | 'updatedAt'>
export type PrintLogInput = Omit<PrintLog, 'id' | 'createdAt' | 'updatedAt'>