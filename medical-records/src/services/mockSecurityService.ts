// src/services/mockSecurityService.ts
import { format, subDays, startOfDay } from 'date-fns'

// Tipos para las métricas de seguridad
export interface SecurityMetrics {
  accessesToday: number
  modificationsToday: number
  printsToday: number
  suspiciousActivity: number
  totalAccesses: number
  failedAccesses: number
  uniqueUsers: number
  uniqueIPs: number
  totalPrints: number
  totalPages: number
  accessTrend: Array<{ date: string, value: number }>
  printTrend: Array<{ date: string, value: number }>
}

export interface AccessLog {
  id: string
  userId: string
  user: {
    firstName: string
    lastName: string
    role: string
  }
  createdAt: string
  ipAddress: string
  accessType: 'login' | 'view_patient' | 'edit_patient' | 'print_document' | 'failed_login'
  patientId?: string
  patient?: {
    firstName: string
    lastName: string
  }
  sessionDuration?: number
  success: boolean
}

export interface ModificationLog {
  id: string
  userId: string
  user: {
    firstName: string
    lastName: string
    role: string
  }
  createdAt: string
  ipAddress: string
  entityType: 'patient' | 'medical_record' | 'consultation'
  entityId: string
  action: 'create' | 'update' | 'delete'
  fieldName: string
  previousValue?: string
  newValue?: string
  patientId?: string
  patient?: {
    firstName: string
    lastName: string
  }
  reason?: string
  metadata?: any
}

// Datos base para simulación
const mockUsers = [
  { id: '1', firstName: 'Ana', lastName: 'García', role: 'Médico' },
  { id: '2', firstName: 'Carlos', lastName: 'López', role: 'Enfermero' },
  { id: '3', firstName: 'María', lastName: 'Rodríguez', role: 'Administrativo' },
  { id: '4', firstName: 'José', lastName: 'Martínez', role: 'Médico' },
  { id: '5', firstName: 'Carmen', lastName: 'Sánchez', role: 'Recepcionista' }
]

const mockPatients = [
  { id: 'PAC001', firstName: 'Juan', lastName: 'Pérez' },
  { id: 'PAC002', firstName: 'Elena', lastName: 'Morales' },
  { id: 'PAC003', firstName: 'Roberto', lastName: 'Silva' },
  { id: 'PAC004', firstName: 'Lucía', lastName: 'Torres' },
  { id: 'PAC005', firstName: 'Miguel', lastName: 'Vargas' }
]

const accessTypes = ['login', 'view_patient', 'edit_patient', 'print_document', 'failed_login'] as const
const entityTypes = ['patient', 'medical_record', 'consultation'] as const
const actions = ['create', 'update', 'delete'] as const
const fieldNames = ['firstName', 'lastName', 'phone', 'address', 'diagnosis', 'treatment', 'medication']

// Clase para simular un servicio de API
export class MockSecurityService {
  private static instance: MockSecurityService
  private data: {
    metrics?: SecurityMetrics
    accessLogs?: AccessLog[]
    modificationLogs?: ModificationLog[]
  } = {}

  private constructor() {
    // Generar datos iniciales
    this.initializeData()
  }

  static getInstance(): MockSecurityService {
    if (!MockSecurityService.instance) {
      MockSecurityService.instance = new MockSecurityService()
    }
    return MockSecurityService.instance
  }

  private initializeData() {
    // Generar métricas
    this.data.metrics = this.generateMetrics()
    
    // Generar logs de acceso
    this.data.accessLogs = this.generateAccessLogs(100)
    
    // Generar logs de modificación  
    this.data.modificationLogs = this.generateModificationLogs(50)
  }

  private generateMetrics(): SecurityMetrics {
    const baseDate = new Date()
    
    // Generar tendencias para los últimos 7 días
    const accessTrend = []
    const printTrend = []
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(baseDate, i)
      accessTrend.push({
        date: date.toISOString(),
        value: 20 + Math.floor(Math.random() * 40) // 20-60 accesos por día
      })
      printTrend.push({
        date: date.toISOString(),
        value: 5 + Math.floor(Math.random() * 15) // 5-20 impresiones por día
      })
    }

    return {
      accessesToday: 35 + Math.floor(Math.random() * 30),
      modificationsToday: 8 + Math.floor(Math.random() * 15),
      printsToday: 12 + Math.floor(Math.random() * 10),
      suspiciousActivity: Math.floor(Math.random() * 3), // 0-2 actividades sospechosas
      totalAccesses: 1200 + Math.floor(Math.random() * 300),
      failedAccesses: 15 + Math.floor(Math.random() * 20),
      uniqueUsers: mockUsers.length,
      uniqueIPs: 8 + Math.floor(Math.random() * 12),
      totalPrints: 280 + Math.floor(Math.random() * 120),
      totalPages: 1100 + Math.floor(Math.random() * 400),
      accessTrend,
      printTrend
    }
  }

  private generateAccessLogs(count: number): AccessLog[] {
    const logs: AccessLog[] = []
    
    for (let i = 0; i < count; i++) {
      const user = mockUsers[Math.floor(Math.random() * mockUsers.length)]
      const accessType = accessTypes[Math.floor(Math.random() * accessTypes.length)]
      const success = accessType !== 'failed_login' && Math.random() > 0.1 // 90% success rate
      
      let patient: { firstName: string; lastName: string } | undefined = undefined
      let patientId: string | undefined = undefined
      
      // Solo asignar paciente para acciones relacionadas con pacientes
      if (['view_patient', 'edit_patient'].includes(accessType)) {
        const mockPatient = mockPatients[Math.floor(Math.random() * mockPatients.length)]
        patient = { firstName: mockPatient.firstName, lastName: mockPatient.lastName }
        patientId = mockPatient.id
      }

      logs.push({
        id: `access_${i + 1}`,
        userId: user.id,
        user,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        ipAddress: this.generateRandomIP(),
        accessType,
        patientId,
        patient,
        sessionDuration: success ? 15 + Math.floor(Math.random() * 45) : undefined,
        success
      })
    }
    
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  private generateModificationLogs(count: number): ModificationLog[] {
    const logs: ModificationLog[] = []
    
    for (let i = 0; i < count; i++) {
      const user = mockUsers[Math.floor(Math.random() * mockUsers.length)]
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)]
      const action = actions[Math.floor(Math.random() * actions.length)]
      const fieldName = fieldNames[Math.floor(Math.random() * fieldNames.length)]
      
      let patient: { firstName: string; lastName: string } | undefined = undefined
      let patientId: string | undefined = undefined
      
      // Asignar paciente para entidades relacionadas
      if (entityType === 'patient' || Math.random() > 0.3) {
        const mockPatient = mockPatients[Math.floor(Math.random() * mockPatients.length)]
        patient = { firstName: mockPatient.firstName, lastName: mockPatient.lastName }
        patientId = mockPatient.id
      }

      logs.push({
        id: `mod_${i + 1}`,
        userId: user.id,
        user,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        ipAddress: this.generateRandomIP(),
        entityType,
        entityId: `${entityType}_${Math.floor(Math.random() * 1000)}`,
        action,
        fieldName,
        previousValue: action !== 'create' ? this.generateFieldValue(fieldName) : undefined,
        newValue: action !== 'delete' ? this.generateFieldValue(fieldName) : undefined,
        patientId,
        patient,
        reason: Math.random() > 0.7 ? 'Actualización de rutina' : undefined
      })
    }
    
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  private generateRandomIP(): string {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
  }

  private generateFieldValue(fieldName: string): string {
    const values: Record<string, string[]> = {
      firstName: ['Juan', 'María', 'Carlos', 'Ana', 'José'],
      lastName: ['García', 'López', 'Martínez', 'Rodríguez', 'Sánchez'],
      phone: ['123-456-789', '987-654-321', '555-123-456'],
      address: ['Calle Principal 123', 'Av. Libertad 456', 'Plaza Central 789'],
      diagnosis: ['Hipertensión', 'Diabetes tipo 2', 'Gastritis', 'Migraña'],
      treatment: ['Reposo relativo', 'Medicación oral', 'Fisioterapia', 'Dieta especial'],
      medication: ['Ibuprofeno 400mg', 'Paracetamol 500mg', 'Omeprazol 20mg']
    }
    
    const fieldValues = values[fieldName] || ['Valor ejemplo']
    return fieldValues[Math.floor(Math.random() * fieldValues.length)]
  }

  // Métodos públicos que simulan llamadas API
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    // Simular delay de red
    await this.delay(300 + Math.random() * 700)
    
    // Actualizar algunos valores dinámicamente
    if (this.data.metrics) {
      // Pequeñas variaciones en los datos para simular datos "en vivo"
      this.data.metrics.accessesToday += Math.floor(Math.random() * 3) - 1
      this.data.metrics.modificationsToday += Math.floor(Math.random() * 2) - 1
      this.data.metrics.printsToday += Math.floor(Math.random() * 2)
      
      // Mantener valores mínimos
      this.data.metrics.accessesToday = Math.max(0, this.data.metrics.accessesToday)
      this.data.metrics.modificationsToday = Math.max(0, this.data.metrics.modificationsToday)
      this.data.metrics.printsToday = Math.max(0, this.data.metrics.printsToday)
    }
    
    return this.data.metrics!
  }

  async getAccessLogs(filters: any = {}, page = 1, limit = 20): Promise<{
    data: AccessLog[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    await this.delay(400 + Math.random() * 600)
    
    let filteredLogs = [...(this.data.accessLogs || [])]
    
    // Aplicar filtros
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => 
        log.user.firstName.toLowerCase().includes(filters.userId.toLowerCase()) ||
        log.user.lastName.toLowerCase().includes(filters.userId.toLowerCase())
      )
    }
    
    if (filters.accessType) {
      filteredLogs = filteredLogs.filter(log => log.accessType === filters.accessType)
    }
    
    if (filters.success !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.success === filters.success)
    }
    
    if (filters.dateFrom) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.createdAt) >= new Date(filters.dateFrom)
      )
    }
    
    if (filters.dateTo) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.createdAt) <= new Date(filters.dateTo)
      )
    }

    // Paginación
    const total = filteredLogs.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const end = start + limit
    
    return {
      data: filteredLogs.slice(start, end),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    }
  }

  async getModificationLogs(filters: any = {}, page = 1, limit = 20): Promise<{
    data: ModificationLog[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    await this.delay(400 + Math.random() * 600)
    
    let filteredLogs = [...(this.data.modificationLogs || [])]
    
    // Aplicar filtros similares a los de access logs
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => 
        log.user.firstName.toLowerCase().includes(filters.userId.toLowerCase()) ||
        log.user.lastName.toLowerCase().includes(filters.userId.toLowerCase())
      )
    }
    
    if (filters.entityType) {
      filteredLogs = filteredLogs.filter(log => log.entityType === filters.entityType)
    }
    
    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action)
    }

    // Paginación
    const total = filteredLogs.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const end = start + limit
    
    return {
      data: filteredLogs.slice(start, end),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    }
  }

  async exportReport(options: {
    reportType: 'access' | 'modification'
    format: 'excel' | 'pdf' | 'csv'
    filters?: any
  }): Promise<{ success: boolean; downloadUrl?: string }> {
    await this.delay(1000 + Math.random() * 2000)
    
    
    return {
      success: true,
      downloadUrl: `mock-report-${options.reportType}-${Date.now()}.${options.format}`
    }
  }

  // Método para simular delay de red
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Método para regenerar datos (útil para testing)
  regenerateData() {
    this.initializeData()
  }
}