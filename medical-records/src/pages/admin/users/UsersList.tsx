// src/pages/admin/users/UsersList.tsx
import React, { useEffect, useState } from 'react'
import {
  Search, Edit, Trash2, Eye, UserX,
  UserCheck, Calendar, Mail, Phone
} from 'lucide-react'
import { Input, Card, Button } from '@/components/ui'
import { ConfirmationModal, useConfirmationModal } from '@/components/ui/ConfirmationModal'
import { useToast } from '@/components/ui/ToastNotifications'
import { EditUserModal } from './EditUserModal'
import type { UserRole } from '@/types'
import { useAuthStore } from '@/stores'

// ===== Tipos =====
type ApiUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: UserRole
  speciality?: string
  isActive: boolean
  lastLogin?: string | null
  createdAt: string
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: UserRole
  speciality?: string
  isActive: boolean
  lastLogin?: Date
  createdAt: Date
}

// ===== Helpers =====
function parseApiUser(u: ApiUser): User {
  return {
    ...u,
    createdAt: new Date(u.createdAt),
    lastLogin: u.lastLogin ? new Date(u.lastLogin) : undefined,
  }
}


// Base de API configurable (opcional; si usas proxy, deja fetch('/api/users'))
const API_BASE = import.meta.env.VITE_API_URL ?? ''

// Helpers para construir URL y headers con auth
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path)
const buildHeaders = (extra?: Record<string, string>): Record<string, string> => {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = { ...(extra ?? {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export function UsersList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const { user: currentUser } = useAuthStore()
  const canDelete = currentUser?.role === 'admin'

  const toast = useToast()
  const { isOpen, config, confirm, close } = useConfirmationModal()

  // Estado real de usuarios (se llena desde API; fallback a MOCK_USERS si falla)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const url = apiUrl('/api/users')
      const resp = await fetch(url, {
        headers: buildHeaders({ Accept: 'application/json' }),
      })
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`)
      }
      const data = await resp.json()
      const raw = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []
      const parsed: User[] = raw.map((u: ApiUser) => parseApiUser(u))
      setUsers(parsed)
    } catch (e: any) {
      console.warn('[UsersList] No se pudo cargar desde /api/users. Motivo:', e?.message || e)
      setUsers([])
      setErrorMsg('No se pudo cargar la lista desde el servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

const getRoleLabel = (role: UserRole) => {
  const labels: Record<string, string> = {
    admin: '👑 Administrador',
    doctor: '👨‍⚕️ Médico',
    nurse: '👩‍⚕️ Enfermera',
  }
  return labels[role] ?? 'Rol desconocido'
}

const getRoleColor = (role: UserRole) => {
  const colors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    doctor: 'bg-blue-100 text-blue-800 border-blue-200',
    nurse: 'bg-green-100 text-green-800 border-green-200',
  }
  return colors[role] ?? 'bg-gray-100 text-gray-800 border-gray-200'
}

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)

  const getStatusColor = (isActive: boolean, lastLogin?: Date) => {
    if (!isActive) return 'bg-red-500'
    if (lastLogin) {
      const days = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
      if (days <= 1) return 'bg-green-500'
      if (days <= 7) return 'bg-yellow-500'
    }
    return 'bg-gray-400'
  }

  const getStatusLabel = (isActive: boolean, lastLogin?: Date) => {
    if (!isActive) return 'Inactivo'
    if (lastLogin) {
      const days = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
      if (days === 0) return 'En línea'
      if (days <= 1) return 'Hace 1 día'
      if (days <= 7) return `Hace ${days} días`
    }
    return 'Inactivo hace tiempo'
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setIsEditModalOpen(true)
  }

  const handleUserUpdate = (updatedUser: User) => {
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)))
    setIsEditModalOpen(false)
    setEditingUser(null)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingUser(null)
  }

const executeToggleUserStatus = async (userId: string) => {
    const userToUpdate = users.find(u => u.id === userId)
    if (!userToUpdate) return

    const previousStatus = userToUpdate.isActive
    const newStatus = !previousStatus

    // Optimistic UI update
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isActive: newStatus } : u)))

    try {
      const resp = await fetch(apiUrl(`/api/users/${userId}/status`), {
        method: 'PATCH',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ isActive: newStatus }),
      })

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`)
      }

      // Si el backend devuelve el usuario actualizado, sincronizamos con el servidor
      const maybeUser = await resp.json().catch(() => null)
      if (maybeUser && maybeUser.id) {
        const parsed = parseApiUser(maybeUser as ApiUser)
        setUsers(prev => prev.map(u => (u.id === userId ? parsed : u)))
      }

      // 🔑 CLAVE: Notificar a UsersPage que debe refrescar los stats
      window.dispatchEvent(new CustomEvent('users:changed'))

      if (newStatus) {
        toast.success('✅ Usuario activado', `${userToUpdate.firstName} ${userToUpdate.lastName} puede acceder al sistema nuevamente`)
      } else {
        toast.warning('⚠️ Usuario desactivado', `${userToUpdate.firstName} ${userToUpdate.lastName} ya no puede acceder al sistema`)
      }
    } catch (err: any) {
      // Rollback
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isActive: previousStatus } : u)))
      toast.error('No se pudo actualizar el estado', err?.message || 'Error desconocido')
    }
  }

  const executeDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId)
    if (!userToDelete) return

    // Guardar snapshot para rollback
    const snapshot = users

    // Optimistic remove
    setUsers(prev => prev.filter(u => u.id !== userId))

    try {
      const resp = await fetch(apiUrl(`/api/users/${userId}`), {
        method: 'DELETE',
        headers: buildHeaders(),
      })

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`)
      }

      toast.success('🗑️ Usuario eliminado', `${userToDelete.firstName} ${userToDelete.lastName} fue eliminado correctamente`)
    } catch (err: any) {
      // Rollback
      setUsers(snapshot)
      toast.error('No se pudo eliminar el usuario', err?.message || 'Error desconocido')
    }
  }

  const handleDeleteUser = (userId: string) => {
    if (!canDelete) {
      toast.error('No autorizado', 'Solo administradores pueden eliminar usuarios')
      return
    }
    const target = users.find(u => u.id === userId)
    if (!target) return
    if (target.role === 'admin') {
      toast.warning('Acción no permitida', 'No puedes eliminar cuentas con rol Administrador')
      return
    }
    if (currentUser?.id === userId) {
      toast.warning('Acción no permitida', 'No puedes eliminar tu propia cuenta')
      return
    }
    confirm({
      title: 'Eliminar usuario',
      message: `Esta acción no se puede deshacer.\n\n¿Eliminar a ${target.firstName} ${target.lastName}?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: () => executeDeleteUser(userId),
    })
  }

  const handleToggleUserStatus = (userId: string) => {
    const userToUpdate = users.find(u => u.id === userId)
    if (!userToUpdate) return
    const isActivating = !userToUpdate.isActive
    if (isActivating) {
      confirm({
        title: '✅ Activar Usuario',
        message: `¿Activar a ${userToUpdate.firstName} ${userToUpdate.lastName}?\n\nRecuperará los permisos de su rol: ${getRoleLabel(userToUpdate.role).toLowerCase()}.`,
        confirmText: 'Sí, Activar',
        cancelText: 'Cancelar',
        type: 'success',
        onConfirm: () => executeToggleUserStatus(userId),
      })
    } else {
      const roleWarning =
        userToUpdate.role === 'admin'
          ? '\n\n⚠️ ATENCIÓN: Este es un usuario administrador.'
          : userToUpdate.role === 'doctor'
          ? '\n\n⚠️ ATENCIÓN: Este es un médico del sistema.'
          : ''
      confirm({
        title: '⚠️ Desactivar Usuario',
        message: `¿Desactivar a ${userToUpdate.firstName} ${userToUpdate.lastName}?\n\nNo podrá acceder hasta reactivarlo.${roleWarning}`,
        confirmText: 'Sí, Desactivar',
        cancelText: 'Cancelar',
        type: 'warning',
        onConfirm: () => executeToggleUserStatus(userId),
      })
    }
  }

  const activeUsers = users.filter(u => u.isActive).length
  const inactiveUsers = users.filter(u => !u.isActive).length

  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      user.firstName.toLowerCase().includes(q) ||
      user.lastName.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      (user.speciality && user.speciality.toLowerCase().includes(q))
    const matchesRole = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar usuarios por nombre, email o especialidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={Search}
              variant="medical"
            />
          </div>

          <div className="w-full sm:w-48">
<select
  value={filterRole}
  onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
  className="w-full rounded-xl border border-blue-200 bg-blue-50/30 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
>
  <option value="all">Todos los roles</option>
  <option value="admin">👑 Administradores</option>
  <option value="doctor">👨‍⚕️ Médicos</option>
  <option value="nurse">👩‍⚕️ Enfermeras</option>
</select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>{loading ? 'Cargando usuarios...' : `Mostrando ${filteredUsers.length} de ${users.length} usuarios`}</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {activeUsers} activos
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              {inactiveUsers} inactivos
            </span>
          </span>
        </div>
      </Card>

      {errorMsg && <Card className="p-3 bg-amber-50 border-amber-200 text-amber-800">{errorMsg}</Card>}

      {/* Lista de usuarios */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 && !loading ? (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No se encontraron usuarios</h3>
            <p className="text-slate-600">
              {searchQuery || filterRole !== 'all' ? 'Intenta ajustar tus filtros de búsqueda' : 'No hay usuarios registrados en el sistema'}
            </p>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.firstName.charAt(0)}
                      {user.lastName.charAt(0)}
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(user.isActive, user.lastLogin)}`}
                      title={getStatusLabel(user.isActive, user.lastLogin)}
                    />
                  </div>

                  {/* Información del usuario */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`font-semibold ${user.isActive ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                        {user.firstName} {user.lastName}
                        {!user.isActive && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-normal">DESACTIVADO</span>
                        )}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail className="h-4 w-4 text-sky-600" />
                        <span className="text-slate-900">{user.email}</span>
                      </div>

                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Phone className="h-4 w-4 text-emerald-600" />
                          <span className="text-slate-900">{user.phone}</span>
                        </div>
                      )}

                      {user.speciality && <div className="text-sm font-medium text-blue-600">{user.speciality}</div>}

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Creado: {formatDate(user.createdAt)}</span>
                        </div>
                        {user.lastLogin && (
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>Último acceso: {formatDate(user.lastLogin)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                    title="Editar usuario"
                    className="text-sky-700 hover:text-sky-800 hover:bg-sky-50"
                  >
                    <Edit className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleUserStatus(user.id)}
                    className={user.isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                    title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                  >
                    {user.isActive ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                  </Button>

                  {canDelete && user.role !== 'admin' && user.id !== currentUser?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      title="Eliminar usuario"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de edición */}
      <EditUserModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} user={editingUser} onUserUpdate={handleUserUpdate} />

      {/* Modal de confirmación */}
      {config && (
        <ConfirmationModal
          isOpen={isOpen}
          onClose={close}
          onConfirm={config.onConfirm}
          title={config.title}
          message={config.message}
          confirmText={config.confirmText}
          cancelText={config.cancelText}
          type={config.type}
        />
      )}
    </div>
  )
}