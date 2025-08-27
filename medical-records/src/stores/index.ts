// src/stores/index.ts - SIN getDemoCredentialsText Y SIN CITAS

import type {
  User,
  Patient,
  MedicalRecord,
  Consultation,
  SearchFilters,
  PaginationState,
  ApiError,
  SystemSettings
} from '@/types'

// ============================================================================
// EXPORTS DE STORES SEPARADOS (SIN getDemoCredentialsText)
// ============================================================================

export { useAuthStore, DEMO_CREDENTIALS } from './authStore'
export { usePatientsStore } from './patientsStore'
export * from './patientsStore'

// ============================================================================
// UI STORE
// ============================================================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface UIState {
  modals: {
    createPatient: boolean
    editPatient: boolean
    createConsultation: boolean
    createUser: boolean
    editUser: boolean
  }
  
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  globalLoading: boolean
  
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: Date
  }>

  openModal: (modal: keyof UIState['modals']) => void
  closeModal: (modal: keyof UIState['modals']) => void
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  setGlobalLoading: (loading: boolean) => void
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      immer((set, get) => ({
        modals: {
          createPatient: false,
          editPatient: false,
          createConsultation: false,
          createUser: false,
          editUser: false
        },
        sidebarOpen: true,
        theme: 'light',
        globalLoading: false,
        notifications: [],

        openModal: (modal) => {
          set((state) => {
            state.modals[modal] = true
          })
        },

        closeModal: (modal) => {
          set((state) => {
            state.modals[modal] = false
          })
        },

        toggleSidebar: () => {
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen
          })
        },

        setSidebar: (open: boolean) => {
          set((state) => {
            state.sidebarOpen = open
          })
        },

        setTheme: (theme) => {
          set((state) => {
            state.theme = theme
          })
        },

        setGlobalLoading: (loading: boolean) => {
          set((state) => {
            state.globalLoading = loading
          })
        },

        addNotification: (notification) => {
          const id = Math.random().toString(36).substr(2, 9)
          const newNotification = {
            ...notification,
            id,
            timestamp: new Date()
          }

          set((state) => {
            state.notifications.unshift(newNotification)
            if (state.notifications.length > 10) {
              state.notifications = state.notifications.slice(0, 10)
            }
          })

          setTimeout(() => {
            get().removeNotification(id)
          }, 5000)
        },

        removeNotification: (id: string) => {
          set((state) => {
            state.notifications = state.notifications.filter((n: UIState['notifications'][0]) => n.id !== id)
          })
        },

        clearNotifications: () => {
          set((state) => {
            state.notifications = []
          })
        }
      })),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          theme: state.theme
        })
      }
    ),
    { name: 'ui-store' }
  )
)

// ============================================================================
// HELPER HOOKS
// ============================================================================

import { useAuthStore } from './authStore'
import { usePatientsStore } from './patientsStore'

export const useGlobalLoading = () => {
  const authLoading = useAuthStore(state => state.isLoading)
  const patientsLoading = usePatientsStore(state => state.isLoading)
  const globalLoading = useUIStore(state => state.globalLoading)

  return authLoading || patientsLoading || globalLoading
}

export const useGlobalError = () => {
  const authError = useAuthStore(state => state.error)
  const patientsError = usePatientsStore(state => state.error)

  const firstError = authError || patientsError

  return firstError
}