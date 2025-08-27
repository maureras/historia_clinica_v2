// src/stores/patientsStore.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Patient, Gender, DocumentType, BloodType, Address, EmergencyContact } from '@/types'
import api from '@/lib/api'

// --- (puedes mantener tus MOCKS si los usas en modo demo) ---

interface PatientsState {
  patients: Patient[]
  selectedPatient: Patient | null
  isLoading: boolean
  error: string | null

  fetchPatients: () => Promise<void>
  selectPatient: (patient: Patient | null) => void
  createPatient: (data: Partial<Patient>) => Promise<Patient>
  updatePatient: (id: string, data: Partial<Patient>) => Promise<void>
  deletePatient: (id: string) => Promise<void>
  clearError: () => void
}

export const usePatientsStore = create<PatientsState>()(
  devtools(
    persist(
      immer<PatientsState>((set, get) => ({
        patients: [],
        selectedPatient: null,
        isLoading: false,
        error: null,

        async fetchPatients() {
          set((s: PatientsState) => { s.isLoading = true; s.error = null })
          try {
            const { data } = await api.get<unknown[]>('api/patients')
            const normalized = Array.isArray(data) ? data.map(normalizePatient) : []
            set((s: PatientsState) => { s.patients = normalized; s.isLoading = false })
          } catch (err) {
            set((s: PatientsState) => {
              s.error = err instanceof Error ? err.message : 'Error al cargar pacientes'
              s.isLoading = false
            })
          }
        },

        selectPatient(patient) {
          set((s: PatientsState) => { s.selectedPatient = patient })
        },

        async createPatient(payload) {
          const { data } = await api.post<unknown>('api/patients', payload as Partial<Patient>)
          const normalized = normalizePatient(data)
          set((s: PatientsState) => { s.patients.unshift(normalized) })
          return normalized
        },

        async updatePatient(id, payload) {
          const { data } = await api.put<unknown>(`api/patients/${id}`, payload as Partial<Patient>)
          const normalized = normalizePatient(data)
          set((s: PatientsState) => {
            const i = s.patients.findIndex((p) => p.id === id)
            if (i >= 0) s.patients[i] = normalized
          })
        },

        async deletePatient(id) {
          await api.delete(`api/patients/${id}`)
          set((s: PatientsState) => { s.patients = s.patients.filter((p) => p.id !== id) })
        },

        clearError() {
          set((s: PatientsState) => { s.error = null })
        },
      })),
      {
        name: 'patients-storage',
        version: 2,
        migrate: (state: any, _fromVersion: number) => {
          // Si no hay estado previo o patients no es array, normalízalo
          if (!state || !Array.isArray(state.patients)) {
            return { ...state, patients: [] }
          }
          return state
        },
        onRehydrateStorage: () => (state) => {
          // Al terminar la rehidratación, forzamos array
          if (state && !Array.isArray((state as PatientsState).patients)) {
            (state as PatientsState).patients = []
          }
        },
      }
    ),
    { name: 'patients-store' }
  )
)

// ---------- Normalizadores ----------

function normalizePatient(raw: any): Patient {
  // fechas: siempre devolver Date para cumplir con el tipo del modelo
  const toDate = (v: any): Date => (v ? new Date(v) : new Date())

  // emergencyContact: viene como string JSON en SQLite
  const emergency =
    typeof raw?.emergencyContact === 'string'
      ? safeParse<EmergencyContact>(raw.emergencyContact)
      : (raw?.emergencyContact as EmergencyContact | undefined) ?? undefined

  // address: si backend devuelve string, mapear a Address mínimo
  const address: Address | undefined =
    typeof raw?.address === 'string'
      ? { street: raw.address, city: '', state: '', country: '' }
      : (raw?.address as Address | undefined)

  return {
    id: String(raw.id),
    firstName: String(raw.firstName ?? ''),
    lastName: String(raw.lastName ?? ''),
    dateOfBirth: toDate(raw.dateOfBirth),
    gender: (raw.gender ?? 'male') as Gender,
    documentType: (raw.documentType ?? 'cedula') as DocumentType,
    documentNumber: raw.documentNumber ?? '',
    phone: raw.phone ?? undefined,
    email: raw.email ?? undefined,
    address,
    emergencyContact: emergency,
    bloodType: (raw.bloodType ?? undefined) as BloodType | undefined,
    allergies: Array.isArray(raw.allergies) ? raw.allergies : [],
    chronicConditions: Array.isArray(raw.chronicConditions) ? raw.chronicConditions : undefined,
    isActive: raw.isActive ?? true,
    qrCode: raw.qrCode ?? undefined,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  }
}

function safeParse<T = unknown>(s: string): T | undefined {
  try { return JSON.parse(s) as T } catch { return undefined }
}