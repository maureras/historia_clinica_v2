import api from '@/lib/api'

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist'

export interface UserDTO {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  speciality?: string | null
  isActive: boolean
  lastLogin?: string | null
  createdAt: string
  updatedAt: string
}

export interface ListUsersResponse {
  items: UserDTO[]
  total: number
  page: number
  pageSize: number
}

export async function listUsers(params?: { query?: string; role?: string; isActive?: boolean; page?: number; pageSize?: number }) {
  const { data } = await api.get<ListUsersResponse>('/api/users', { params })
  return data
}

export async function getUser(id: string) {
  const { data } = await api.get<UserDTO>(`/api/users/${id}`)
  return data
}

export async function createUser(payload: { email: string; password: string; firstName: string; lastName: string; role?: UserRole; speciality?: string | null; isActive?: boolean }) {
  const { data } = await api.post<UserDTO>('/api/users', payload)
  return data
}

export async function updateUser(id: string, payload: Partial<Omit<UserDTO, 'id' | 'createdAt' | 'updatedAt'>>) {
  const { data } = await api.put<UserDTO>(`/api/users/${id}`, payload)
  return data
}

export async function setUserStatus(id: string, isActive: boolean) {
  const { data } = await api.patch<UserDTO>(`/api/users/${id}/status`, { isActive })
  return data
}

export async function changeUserPassword(id: string, newPassword: string) {
  const { data } = await api.patch<{ id: string; message: string }>(`/api/users/${id}/password`, { newPassword })
  return data
}

export async function deleteUser(id: string) {
  const { data } = await api.delete<{ id: string; message: string }>(`/api/users/${id}`)
  return data
}