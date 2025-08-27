// src/stores/useSelectedPatient.ts
import { create } from 'zustand'

export interface SelectedPatient {
  id: string
  nombres: string
  apellidos?: string
  documento?: string
  // agrega campos mínimos que uses en tu UI
}

interface SelectedPatientState {
  selectedPatient: SelectedPatient | null
  setSelectedPatient: (p: SelectedPatient) => void
  clearSelectedPatient: () => void
}

export const useSelectedPatient = create<SelectedPatientState>((set) => ({
  selectedPatient: null,
  setSelectedPatient: (p) => set({ selectedPatient: p }),
  clearSelectedPatient: () => set({ selectedPatient: null }),
}))
