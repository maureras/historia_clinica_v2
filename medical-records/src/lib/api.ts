// src/lib/api.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Usa VITE_API_URL (o localhost por defecto)
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:4000',
  withCredentials: false,
})

// Lee token desde el storage de zustand (persist name: "auth-storage")
// y hace fallback a la clave 'token' si existe.
function getToken(): string | null {
  try {
    // 1) zustand persist
    const raw = localStorage.getItem('auth-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      const t = parsed?.state?.token
      if (typeof t === 'string' && t) return t
    }
    // 2) fallback (authStore también graba 'token')
    const t2 = localStorage.getItem('token')
    return t2 && typeof t2 === 'string' ? t2 : null
  } catch {
    return null
  }
}

// Adjunta Authorization si hay token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Opcional: si el backend devuelve 401/403, limpia y deja caer al flujo de login
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      try {
        localStorage.removeItem('token')
        // Limpia también el persist de zustand sin romper otras keys
        const raw = localStorage.getItem('auth-storage')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.state) {
            parsed.state.token = null
            parsed.state.user = null
            parsed.state.isAuthenticated = false
            localStorage.setItem('auth-storage', JSON.stringify(parsed))
          }
        }
      } catch {}
      // aquí podrías redirigir a /login si usas un router
      // window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

/**
 * Analiza un archivo de laboratorio subiéndolo al backend.
 * @param patientId - ID del paciente
 * @param file - Archivo de laboratorio a analizar
 * @param consultationId - (opcional) ID de la consulta
 */
export function analyzeLab(
  patientId: string,
  file: File,
  consultationId?: string,
): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('patientId', patientId)
  if (consultationId) formData.append('consultationId', consultationId)

  // No fuerces Content-Type; deja que el navegador ponga el boundary
  return api.post('/api/labs/analyze', formData)
}