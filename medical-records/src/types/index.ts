// src/types/index.ts

// ============================================================================
// TIPOS BASE
// ============================================================================

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface User extends BaseEntity {
  email: string
  password?: string
  firstName: string
  lastName: string
  role: UserRole
  speciality?: string | null  // ← AGREGAR ESTA LÍNEA
  isActive: boolean
  lastLogin?: Date
}
export const UserRole = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  RECEPTIONIST: 'receptionist'
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

// ============================================================================
// PACIENTE
// ============================================================================

export interface Patient extends BaseEntity {
  // Información personal
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: Gender
  documentType: DocumentType
  documentNumber: string
  
  // Contacto
  phone?: string
  email?: string
  address?: Address
  emergencyContact?: EmergencyContact
  
  // Información médica básica
  bloodType?: BloodType
  allergies?: string[]
  chronicConditions?: string[]
  
  // Sistema
  isActive: boolean
  qrCode?: string
}

export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
} as const

export type Gender = typeof Gender[keyof typeof Gender]

export const DocumentType = {
  DNI: 'dni',
  PASSPORT: 'passport',
  CEDULA: 'cedula',
  OTHER: 'other'
} as const

export type DocumentType = typeof DocumentType[keyof typeof DocumentType]

export const BloodType = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-'
} as const

export type BloodType = typeof BloodType[keyof typeof BloodType]

export interface Address {
  street: string
  city: string
  state: string
  country: string
  zipCode?: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

// ============================================================================
// HISTORIA CLÍNICA
// ============================================================================

export interface MedicalRecord extends BaseEntity {
  patientId: string
  patient?: Patient // Relación poblada
  consultations: Consultation[]
  diagnoses: Diagnosis[]
  prescriptions: Prescription[]
  labResults: LabResult[]
  vaccinations: Vaccination[]
  surgeries: Surgery[]
  
  // Información general
  familyHistory?: string
  socialHistory?: string
  notes?: string
}

export interface Consultation extends BaseEntity {
  patientId: string
  doctorId: string
  doctor?: User
  
  // Información de la consulta
  date: Date
  reason: string
  symptoms: string
  examination: string
  diagnosis: string
  treatment: string
  notes?: string
  
  // Signos vitales
  vitalSigns?: VitalSigns
  
  // Estado
  status: ConsultationStatus
  followUpDate?: Date
}

export const ConsultationStatus = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
} as const

export type ConsultationStatus = typeof ConsultationStatus[keyof typeof ConsultationStatus]

export interface VitalSigns {
  temperature?: number // Celsius
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  heartRate?: number // BPM
  respiratoryRate?: number
  oxygenSaturation?: number // %
  weight?: number // kg
  height?: number // cm
  bmi?: number
}

// ============================================================================
// DIAGNÓSTICOS Y TRATAMIENTOS
// ============================================================================

export interface Diagnosis extends BaseEntity {
  patientId: string
  consultationId?: string
  doctorId: string
  
  code: string // ICD-10 code
  description: string
  type: DiagnosisType
  severity?: DiagnosisSeverity
  status: DiagnosisStatus
  notes?: string
  
  diagnosisDate: Date
  resolvedDate?: Date
}

export const DiagnosisType = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  DIFFERENTIAL: 'differential',
  PROVISIONAL: 'provisional'
} as const

export type DiagnosisType = typeof DiagnosisType[keyof typeof DiagnosisType]

export const DiagnosisSeverity = {
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe',
  CRITICAL: 'critical'
} as const

export type DiagnosisSeverity = typeof DiagnosisSeverity[keyof typeof DiagnosisSeverity]

export const DiagnosisStatus = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  CHRONIC: 'chronic',
  INACTIVE: 'inactive'
} as const

export type DiagnosisStatus = typeof DiagnosisStatus[keyof typeof DiagnosisStatus]

export interface Prescription extends BaseEntity {
  patientId: string
  doctorId: string
  consultationId?: string
  
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  
  startDate: Date
  endDate?: Date
  status: PrescriptionStatus
  notes?: string
}

export const PrescriptionStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DISCONTINUED: 'discontinued',
  EXPIRED: 'expired'
} as const

export type PrescriptionStatus = typeof PrescriptionStatus[keyof typeof PrescriptionStatus]

// ============================================================================
// EXÁMENES Y RESULTADOS
// ============================================================================

export interface LabResult extends BaseEntity {
  patientId: string
  doctorId: string
  consultationId?: string
  
  testName: string
  category: LabCategory
  results: LabValue[]
  interpretation?: string
  notes?: string
  
  orderedDate: Date
  resultDate: Date
  status: LabStatus
}

export interface LabValue {
  parameter: string
  value: string | number
  unit: string
  referenceRange: string
  isAbnormal: boolean
}

export const LabCategory = {
  BLOOD: 'blood',
  URINE: 'urine',
  IMAGING: 'imaging',
  MICROBIOLOGY: 'microbiology',
  PATHOLOGY: 'pathology',
  OTHER: 'other'
} as const

export type LabCategory = typeof LabCategory[keyof typeof LabCategory]

export const LabStatus = {
  ORDERED: 'ordered',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const

export type LabStatus = typeof LabStatus[keyof typeof LabStatus]

// ============================================================================
// VACUNAS Y CIRUGÍAS
// ============================================================================

export interface Vaccination extends BaseEntity {
  patientId: string
  doctorId: string
  
  vaccine: string
  manufacturer?: string
  lotNumber?: string
  site: string
  route: string
  dose: string
  
  administrationDate: Date
  nextDoseDate?: Date
  reactions?: string
  notes?: string
}

export interface Surgery extends BaseEntity {
  patientId: string
  surgeonId: string
  surgeon?: User
  
  procedure: string
  description: string
  indication: string
  complications?: string
  outcome: string
  
  scheduledDate: Date
  actualDate?: Date
  duration?: number // minutes
  status: SurgeryStatus
  notes?: string
}

export const SurgeryStatus = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  POSTPONED: 'postponed'
} as const

export type SurgeryStatus = typeof SurgeryStatus[keyof typeof SurgeryStatus]

// ============================================================================
// CITAS Y AGENDA
// ============================================================================

export interface Appointment extends BaseEntity {
  patientId: string
  doctorId: string
  patient?: Patient
  doctor?: User
  
  date: Date
  duration: number // minutes
  type: AppointmentType
  reason: string
  status: AppointmentStatus
  notes?: string
  
  // Recordatorios
  reminderSent: boolean
  confirmationStatus: ConfirmationStatus
}

export const AppointmentType = {
  CONSULTATION: 'consultation',
  FOLLOW_UP: 'follow_up',
  EMERGENCY: 'emergency',
  ROUTINE_CHECKUP: 'routine_checkup',
  VACCINATION: 'vaccination',
  PROCEDURE: 'procedure'
} as const

export type AppointmentType = typeof AppointmentType[keyof typeof AppointmentType]

export const AppointmentStatus = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled'
} as const

export type AppointmentStatus = typeof AppointmentStatus[keyof typeof AppointmentStatus]

export const ConfirmationStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined'
} as const

export type ConfirmationStatus = typeof ConfirmationStatus[keyof typeof ConfirmationStatus]

// ============================================================================
// FORMULARIOS Y UI
// ============================================================================

export interface FormState<T = any> {
  data: T
  errors: Record<string, string>
  isSubmitting: boolean
  isDirty: boolean
  isValid: boolean
}

export interface SearchFilters {
  query?: string
  dateFrom?: Date
  dateTo?: Date
  status?: string
  type?: string
  doctorId?: string
  patientId?: string
}

export interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
  errors?: string[]
}

export interface ApiError {
  message: string
  code?: string
  details?: any
}

// ============================================================================
// CONFIGURACIÓN DEL SISTEMA
// ============================================================================

export interface SystemSettings extends BaseEntity {
  clinicName: string
  clinicAddress: Address
  clinicPhone: string
  clinicEmail: string
  
  // Configuraciones
  appointmentDuration: number // minutes
  workingHours: WorkingHours
  holidays: Date[]
  
  // Notificaciones
  emailNotifications: boolean
  smsNotifications: boolean
  reminderHours: number[]
}

export interface WorkingHours {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export interface DaySchedule {
  isOpen: boolean
  openTime?: string // HH:mm
  closeTime?: string // HH:mm
  breakStart?: string // HH:mm
  breakEnd?: string // HH:mm
}

// ============================================================================
// UTILIDADES
// ============================================================================

export type Maybe<T> = T | null | undefined

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>

// Re-exports para facilitar el uso
export type PatientInput = CreateInput<Patient>
export type PatientUpdate = UpdateInput<Patient>
export type ConsultationInput = CreateInput<Consultation>
export type ConsultationUpdate = UpdateInput<Consultation>
export * from './security'
