// src/pages/admin/users/UsersPage.tsx Version productiva
import React, { useState, useEffect, useMemo } from 'react'
import { UserPlus, Users, Shield, Activity } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { useAuthStore } from '@/stores'
import { UsersList } from './UsersList'
import { CreateUserModal, useCreateUserModal } from './CreateUserModal'

type AnyUser = {
  id: string
  firstName?: string
  lastName?: string
  role?: string
  email?: string
  isActive?: boolean
  createdAt?: string | Date | null
  lastLogin?: string | Date | null
}

type StatsResponse = {
  totalUsers: number
  admins: number  
  newThisMonth: number
  activeUsers: number
}

const API_BASE: string = `${((import.meta as any).env?.VITE_API_URL ?? '').replace(/\/$/, '')}/api`
const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const { isOpen, openModal, closeModal } = useCreateUserModal()

  const [users, setUsers] = useState<AnyUser[]>([])
  const [serverStats, setServerStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchUsersList = async (signal?: AbortSignal) => {
    const res = await fetch(`${API_BASE}/users?limit=1000`, {
      headers: { Accept: 'application/json', ...authHeader() },
      credentials: 'include',
      signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return (Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.data)
      ? data.data
      : []) as AnyUser[]
  }

  const fetchStats = async (signal?: AbortSignal) => {
    // 1) Intentamos endpoint de stats si existe
    try {

      
      const res = await fetch(`${API_BASE}/users/stats`, {
        headers: { Accept: 'application/json', ...authHeader() },
        credentials: 'include',
        signal,
      })
      

      if (res.ok) {
        const stats = await res.json()

        return { stats: stats as StatsResponse, list: null as AnyUser[] | null }
      } else {
      }
    } catch (error) {
    }

    // 2) Fallback: traemos lista y calculamos en cliente
    const list = await fetchUsersList(signal)
    return { stats: null as StatsResponse | null, list }
  }

  const refreshUsers = React.useCallback(async () => {
    const ctrl = new AbortController()
    setLoading(true)
    try {
      const { stats, list } = await fetchStats(ctrl.signal)
      
      
      // Si obtuvimos stats del servidor, los usamos
      if (stats) {
        setServerStats(stats)
        // También intentamos obtener la lista de usuarios para la tabla
        try {
          const usersList = await fetchUsersList(ctrl.signal)
          setUsers(usersList)
        } catch {
          // Si falla, mantenemos los usuarios actuales
        }
      } 
      // Si obtuvimos lista, la usamos y calculamos stats en cliente
      else if (list) {
        setUsers(list)
        setServerStats(null) // Limpiamos stats del servidor
      }
    } catch {
      // En error, intentamos al menos tener algo
      try {
        const list = await fetchUsersList()
        setUsers(list)
        setServerStats(null)
      } catch {
        setUsers([])
        setServerStats(null)
      }
    } finally {
      setLoading(false)
    }
    return () => ctrl.abort()
  }, [])

  // Carga inicial + auto-refresh en foco/intervalo + "bus" simple
  useEffect(() => {
    let cancelled = false
    const run = async () => { if (!cancelled) await refreshUsers() }
    run()

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUsers()
    }
    document.addEventListener('visibilitychange', onVisible)

    const onUsersChanged = () => refreshUsers()
    window.addEventListener('users:changed' as any, onUsersChanged)

    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshUsers()
    }, 15000)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('users:changed' as any, onUsersChanged)
      window.clearInterval(id)
    }
  }, [refreshUsers])

  // Al cerrar el modal, refrescamos (y también si el modal emite onCreated)
  const handleCloseModal = () => {
    closeModal()
    refreshUsers()
  }

  // Calculamos stats: usamos del servidor si están disponibles, sino calculamos del cliente
  const { totalUsers, activeUsers, admins, newThisMonth } = useMemo(() => {

    
    // Si tenemos stats del servidor Y la lista de usuarios coincide, los usamos
    if (serverStats && users.length > 0) {
      // Verificar si los datos del servidor parecen actualizados
      const clientTotal = users.length
      const clientActivos = users.filter(u => u.isActive === true).length
      
      // Si hay discrepancia, usar datos del cliente temporalmente
      if (serverStats.totalUsers !== clientTotal || Math.abs(serverStats.activeUsers - clientActivos) > 1) {
        // Continuar con cálculo del cliente abajo
      } else {
        return {
          totalUsers: serverStats.totalUsers,
          activeUsers: serverStats.activeUsers,
          admins: serverStats.admins,
          newThisMonth: serverStats.newThisMonth
        }
      }
    }

    // Fallback: calcular desde la lista de usuarios
    const now = new Date()
    const MS_30D = 30 * 24 * 60 * 60 * 1000

    const total = users.length

    const active = users.filter(u => {
      if (typeof u.isActive === 'boolean') return u.isActive
      const ll = u.lastLogin ? new Date(u.lastLogin as any).getTime() : NaN
      return Number.isFinite(ll) && (now.getTime() - ll) <= MS_30D
    }).length

    const adminsCount = users.filter(u => (u.role ?? '').toLowerCase() === 'admin').length

    const newMonth = users.filter(u => {
      if (!u.createdAt) return false
      const d = new Date(u.createdAt as any)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length

    const clientStats = { totalUsers: total, activeUsers: active, admins: adminsCount, newThisMonth: newMonth }
    
    return clientStats
  }, [serverStats, users])

  if (String(currentUser?.role ?? '').toLowerCase() !== 'admin') {    
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-slate-400 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-900">Acceso Restringido</h2>
          <p className="text-slate-600 max-w-md">
            No tienes permisos para acceder a esta sección. Solo los administradores pueden gestionar usuarios.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
          <p className="text-slate-600">Administra los usuarios del sistema médicos</p>
        </div>
        <Button onClick={openModal} icon={UserPlus} size="lg">
          Crear Usuario
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-slate-900">{activeUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Administradores</p>
              <p className="text-2xl font-bold text-slate-900">{admins}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Nuevos (Este Mes)</p>
              <p className="text-2xl font-bold text-slate-900">{newThisMonth}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de usuarios */}
      <UsersList />

      {/* Modal de Crear */}
      <CreateUserModal
        isOpen={isOpen}
        onClose={handleCloseModal}
        // Si el modal emite onCreated, refrescamos justo al crear
        // @ts-ignore
        onCreated={refreshUsers}
      />
    </div>
  )
}