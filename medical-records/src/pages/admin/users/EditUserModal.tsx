// src/pages/admin/users/EditUserModal.tsx
import React, { useState, useEffect } from 'react'
import { X, User, Mail, Phone, Briefcase, Shield, Save, Lock, Eye, EyeOff } from 'lucide-react'
import { Input, Button } from '@/components/ui'
import { useToast } from '@/components/ui/ToastNotifications'
import type { UserRole } from '@/types'

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

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onUserUpdate: (updatedUser: User) => void
}

// Helpers para API
const API_BASE = import.meta.env.VITE_API_URL ?? ''
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path)
const buildHeaders = (extra?: Record<string, string>): Record<string, string> => {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = { ...(extra ?? {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

const ROLE_OPTIONS: { value: UserRole; label: string; emoji: string }[] = [
  { value: 'admin', label: 'Administrador', emoji: '👑' },
  { value: 'doctor', label: 'Médico', emoji: '👨‍⚕️' },
  { value: 'nurse', label: 'Enfermera', emoji: '👩‍⚕️' },
]

export function EditUserModal({ isOpen, onClose, user, onUserUpdate }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'nurse' as UserRole,
    speciality: '',
    isActive: true,
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const toast = useToast()

  // ======= Estado para cambio de contraseña =======
  const [showPwd, setShowPwd] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [revealPwd, setRevealPwd] = useState(false)
  const [revealPwd2, setRevealPwd2] = useState(false)

  // Llenar el formulario cuando cambie el usuario
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'nurse',
        speciality: user.speciality || '',
        isActive: user.isActive,
      })
      setErrors({})
      // reset sección de password
      setShowPwd(false)
      setNewPassword('')
      setConfirmPassword('')
      setPwdError(null)
      setRevealPwd(false)
      setRevealPwd2(false)
    }
  }, [user])

  // Validaciones
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.firstName.trim()) newErrors.firstName = 'El nombre es obligatorio'
    if (!formData.lastName.trim()) newErrors.lastName = 'El apellido es obligatorio'
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !validateForm()) return
    setIsLoading(true)
    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        role: formData.role,
        speciality: formData.speciality.trim() || null,
        isActive: formData.isActive,
      }
      const response = await fetch(apiUrl(`/api/users/${user.id}`), {
        method: 'PUT',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updateData),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }
      const updatedUserData = await response.json()
      const updatedUser: User = {
        ...updatedUserData,
        createdAt: new Date(updatedUserData.createdAt),
        lastLogin: updatedUserData.lastLogin ? new Date(updatedUserData.lastLogin) : undefined,
      }
      onUserUpdate(updatedUser)
      toast.success('✅ Usuario actualizado', `${updatedUser.firstName} ${updatedUser.lastName} ha sido actualizado correctamente`)
      onClose()
    } catch (error: any) {
      console.error('Error al actualizar usuario:', error)
      toast.error('Error al actualizar', error.message || 'No se pudo actualizar el usuario. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // ======= Resetear contraseña (usa PATCH /api/users/:id/password) =======
  const handleResetPassword = async () => {
    setPwdError(null)
    if (!user) return
    if (newPassword.length < 6) {
      setPwdError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Las contraseñas no coinciden')
      return
    }
    setPwdLoading(true)
    try {
      const resp = await fetch(apiUrl(`/api/users/${user.id}/password`), {
        method: 'PATCH',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ newPassword }),
      })
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${resp.status}`)
      }
      // opcional: notificar al dashboard para refrescar algo
      window.dispatchEvent(new CustomEvent('users:changed'))
      toast.success('🔒 Contraseña actualizada', `La contraseña de ${user.firstName} ${user.lastName} fue cambiada correctamente`)
      setNewPassword('')
      setConfirmPassword('')
      setShowPwd(false)
    } catch (err: any) {
      setPwdError(err?.message || 'No se pudo actualizar la contraseña')
    } finally {
      setPwdLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading && !pwdLoading) {
      setErrors({})
      setPwdError(null)
      onClose()
    }
  }

  if (!isOpen || !user) return null

  const getRoleLabel = (role: UserRole) => {
    const option = ROLE_OPTIONS.find(opt => opt.value === role)
    return option ? `${option.emoji} ${option.label}` : role
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h[90vh] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Editar Usuario</h2>
              <p className="text-sm text-slate-600">Actualizar información de {user.firstName} {user.lastName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isLoading || pwdLoading}
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre y Apellido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Ingresa el nombre"
                  leftIcon={User}
                  variant="medical"
                  disabled={isLoading}
                  className={errors.firstName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                />
                {errors.firstName && <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Apellido *</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Ingresa el apellido"
                  leftIcon={User}
                  variant="medical"
                  disabled={isLoading}
                  className={errors.lastName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                />
                {errors.lastName && <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Correo electrónico *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="usuario@ejemplo.com"
                leftIcon={Mail}
                variant="medical"
                disabled={isLoading}
                className={errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Teléfono</label>
              <Input
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Número de teléfono (opcional)"
                leftIcon={Phone}
                variant="medical"
                disabled={isLoading}
              />
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Rol del usuario *</label>
              <div className="relative">
                <Shield className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-200 bg-blue-50/30 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.emoji} {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Especialidad */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Especialidad</label>
              <Input
                value={formData.speciality}
                onChange={(e) => handleInputChange('speciality', e.target.value)}
                placeholder="Especialidad médica (opcional)"
                leftIcon={Briefcase}
                variant="medical"
                disabled={isLoading}
              />
            </div>

            {/* Estado activo/inactivo */}
            <div className="bg-slate-50 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  disabled={isLoading}
                  className="w-5 h-5 text-blue-600 bg-white border-2 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">Usuario activo</span>
                  <p className="text-xs text-slate-500">
                    {formData.isActive ? 'El usuario puede iniciar sesión y usar el sistema' : 'El usuario no puede iniciar sesión'}
                  </p>
                </div>
              </label>
            </div>

            {/* ======= Cambiar contraseña ======= */}
            <div className="rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <span className="flex items-center gap-2 text-slate-800 font-medium">
                  <Lock className="w-4 h-4" /> Cambiar contraseña
                </span>
                <span className="text-sm text-slate-500">{showPwd ? 'Ocultar' : 'Mostrar'}</span>
              </button>

              {showPwd && (
                <div className="px-4 pb-4 pt-1 space-y-3 bg-slate-50">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña *</label>
                    <div className="relative">
                      <Input
                        type={revealPwd ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        leftIcon={Lock}
                        variant="medical"
                        disabled={pwdLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setRevealPwd(v => !v)}
                        className="absolute right-3 top-2.5 text-slate-500"
                        title={revealPwd ? 'Ocultar' : 'Mostrar'}
                      >
                        {revealPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña *</label>
                    <div className="relative">
                      <Input
                        type={revealPwd2 ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite la contraseña"
                        leftIcon={Lock}
                        variant="medical"
                        disabled={pwdLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setRevealPwd2(v => !v)}
                        className="absolute right-3 top-2.5 text-slate-500"
                        title={revealPwd2 ? 'Ocultar' : 'Mostrar'}
                      >
                        {revealPwd2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {pwdError && <p className="text-red-600 text-xs">{pwdError}</p>}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleResetPassword}
                      disabled={pwdLoading}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                    >
                      {pwdLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Actualizando…
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Actualizar contraseña
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading || pwdLoading}
            className="text-slate-600 hover:text-slate-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || pwdLoading}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium px-6 py-2 rounded-xl transition-all duration-200 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}