// ============================================================================
// 2. AUTHSTORE CORREGIDO - src/stores/authStore.ts
// ============================================================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { User, UserRole } from '@/types'
import api from '@/lib/api'
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true'
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@clinica.com',
    password: 'admin123',
    firstName: 'Dr. Juan',
    lastName: 'Pérez',
    role: 'admin' as UserRole,
    speciality: 'Medicina General',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLogin: new Date()
  },
  {
    id: '2', 
    email: 'doctor@clinica.com',
    password: 'doctor123',
    firstName: 'Dra. María',
    lastName: 'González',
    role: 'doctor' as UserRole,
    speciality: 'Cardiología',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLogin: new Date()
  },
  {
    id: '3',
    email: 'enfermera@clinica.com', 
    password: 'enfermera123',
    firstName: 'Ana',
    lastName: 'Rodríguez',
    role: 'nurse' as UserRole,
    speciality: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLogin: new Date()
  }
]

class MockAuthService {
  private delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  async login(email: string, password: string) {
    await this.delay(800)
    
    const user = MOCK_USERS.find(u => u.email === email && u.password === password)
    
    if (!user) {
      throw new Error('Credenciales inválidas')
    }

    const { password: _, ...userWithoutPassword } = {
      ...user,
      lastLogin: new Date(),
      updatedAt: new Date()
    }
    
    const token = `mock-token-${user.id}-${Date.now()}`
    
    return {
      user: userWithoutPassword,
      token
    }
  }

  async verifyToken(token: string) {
    await this.delay(300)
    
    if (!token || !token.startsWith('mock-token-')) {
      throw new Error('Token inválido')
    }
    
    const userId = token.split('-')[2]
    const user = MOCK_USERS.find(u => u.id === userId)
    
    if (!user) {
      throw new Error('Usuario no encontrado')
    }

    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  async updateProfile(data: Partial<User>) {
    await this.delay(500)
    return { 
      ...data, 
      updatedAt: new Date()
    }
  }
}

const mockAuthService = new MockAuthService()

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (email: string, password: string) => {
          set((state) => {
            state.isLoading = true
            state.error = null
          })

          try {
            if (USE_BACKEND) {
              // ⬇️ backend real
              const { data } = await api.post('/auth/login', { email, password })
              // backend devuelve { token, user }
              set(s => {
                s.user = data.user
                s.token = data.token
                s.isAuthenticated = true
                s.isLoading = false
              })
              localStorage.setItem('token', data.token)

            } else {
              // ⬇️ mock existente
              const { user, token } = await mockAuthService.login(email, password)
              set(s => {
                s.user = user
                s.token = token
                s.isAuthenticated = true
                s.isLoading = false
              })
localStorage.setItem('token', token)

            }
          } catch (err) {
            set(s => {
              s.error = err instanceof Error ? err.message : 'Error de autenticación'
              s.isLoading = false
            })
            throw err
          }
        },

        logout: () => {
          set((state) => {
            state.user = null
            state.token = null
            state.isAuthenticated = false
            state.error = null
          })
          localStorage.removeItem('token')
        },

        checkAuth: async () => {
          const token = get().token
          if (!token) {
            set(s => { s.isLoading = false })
            return
          }
          set(s => { s.isLoading = true })

          try {
            if (USE_BACKEND) {
              const { data } = await api.get('/auth/me') // requiere header Authorization (lo pone el interceptor)
              set(s => {
                s.user = data.user
                s.isAuthenticated = true
                s.isLoading = false
              })
            } else {
              const user = await mockAuthService.verifyToken(token)
              set(s => {
                s.user = user
                s.isAuthenticated = true
                s.isLoading = false
              })
            }
          } catch {
            set(s => {
              s.user = null
              s.token = null
              s.isAuthenticated = false
              s.isLoading = false
            })
          }
        },


        updateProfile: async (data: Partial<User>) => {
          const token = get().token
          if (!token) throw new Error('No autenticado')

          try {
            const updatedData = await mockAuthService.updateProfile(data)

            set((state) => {
              if (state.user) {
                state.user = { ...state.user, ...updatedData }
              }
            })
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Error al actualizar'
            })
            throw error
          }
        },

        clearError: () => {
          set((state) => {
            state.error = null
          })
        }
      })),
{ name: 'auth-storage',
        partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated })
      }
    ),
    { name: 'auth-store' }
  )
)

export const DEMO_CREDENTIALS = {
  admin: { email: 'admin@clinica.com', password: 'admin123' },
  doctor: { email: 'doctor@clinica.com', password: 'doctor123' },
  nurse: { email: 'enfermera@clinica.com', password: 'enfermera123' }
} as const

export const getDemoCredentialsText = () => `
🔧 CREDENCIALES DE PRUEBA:

👨‍💼 Admin: admin@clinica.com / admin123
👨‍⚕️ Médico: doctor@clinica.com / doctor123  
👩‍⚕️ Enfermera: enfermera@clinica.com / enfermera123
`