// src/pages/admin/users/CreateUserModal.tsx
import React, { useState } from 'react'
import { 
  UserPlus, Save, X, Mail, User, Lock, Shield, Briefcase, Phone
} from 'lucide-react'
import { Button, Input, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/ToastNotifications'
import { useUIStore, useAuthStore } from '@/stores'
import { createUser } from '@/services/users'

type BackendRole = 'admin' | 'doctor' | 'nurse'

// Opciones de roles con información detallada
const ROLE_OPTIONS: { value: BackendRole; label: string; emoji: string; description: string }[] = [
  { 
    value: 'doctor', 
    label: 'Médico', 
    emoji: '👨‍⚕️', 
    description: 'Puede gestionar pacientes, crear consultas médicas y ver historias clínicas completas' 
  },
  { 
    value: 'nurse', 
    label: 'Enfermera', 
    emoji: '👩‍⚕️', 
    description: 'Puede ver pacientes asignados y actualizar registros básicos de salud' 
  },
  { 
    value: 'admin', 
    label: 'Administrador', 
    emoji: '👑', 
    description: 'Acceso completo al sistema, puede crear usuarios y configurar el sistema' 
  },
]

// ========================= CREATE USER MODAL =========================
interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
    onCreated?: (user: any) => void

}

export function CreateUserModal({ isOpen, onClose, onCreated }: CreateUserModalProps) {
  const { user: currentUser } = useAuthStore()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'doctor' as BackendRole,
    speciality: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Solo admin puede crear usuarios
  if (currentUser?.role !== 'admin') {
    return null
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.firstName.trim()) newErrors.firstName = 'Nombres son requeridos'
    if (!formData.lastName.trim()) newErrors.lastName = 'Apellidos son requeridos'
    if (!formData.email.trim()) {
      newErrors.email = 'Email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }
    if (!formData.password) {
      newErrors.password = 'Contraseña es requerida'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Contraseña debe tener al menos 6 caracteres'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        password: formData.password,
        role: formData.role,
        speciality: formData.speciality.trim() || null,
        isActive: true,
      }

      const newUser = await createUser(userData)

      toast.success(
        'Usuario creado exitosamente',
        `${newUser.firstName} ${newUser.lastName} agregado con rol ${getRoleLabel(newUser.role)}`
      )

      resetForm()
      onClose()
    } catch (err: any) {
      toast.error(
        'Error al crear usuario',
        err?.message || 'No se pudo crear el usuario'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'doctor',
      speciality: ''
    })
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const getRoleLabel = (role: BackendRole) => {
    const option = ROLE_OPTIONS.find(opt => opt.value === role)
    return option ? option.label : role
  }

  const getSelectedRoleInfo = () => {
    return ROLE_OPTIONS.find(opt => opt.value === formData.role)
  }

  const selectedRole = getSelectedRoleInfo()

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Crear Nuevo Usuario"
      size="lg"
    >
      <div className="space-y-6">
        {/* Alert de admin */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">Panel de Administrador</h3>
              <p className="text-sm text-blue-700">
                Estás creando un nuevo usuario del sistema. Asegúrate de asignar el rol correcto.
              </p>
            </div>
          </div>
        </div>

        {/* Información personal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nombres *
            </label>
            <Input
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="Nombres del usuario"
              leftIcon={User}
              variant="medical"
              disabled={loading}
              className={errors.firstName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {errors.firstName && (
              <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Apellidos *
            </label>
            <Input
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Apellidos del usuario"
              leftIcon={User}
              variant="medical"
              disabled={loading}
              className={errors.lastName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {errors.lastName && (
              <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email y Teléfono */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Correo electrónico *
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="usuario@clinica.com"
              leftIcon={Mail}
              variant="medical"
              disabled={loading}
              className={errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {errors.email && (
              <p className="text-red-600 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Teléfono
            </label>
            <Input
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Número de teléfono (opcional)"
              leftIcon={Phone}
              variant="medical"
              disabled={loading}
            />
          </div>
        </div>

        {/* Contraseñas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña *
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Mínimo 6 caracteres"
              leftIcon={Lock}
              variant="medical"
              disabled={loading}
              className={errors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {errors.password && (
              <p className="text-red-600 text-xs mt-1">{errors.password}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirmar Contraseña *
            </label>
            <Input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Repetir contraseña"
              leftIcon={Lock}
              variant="medical"
              disabled={loading}
              className={errors.confirmPassword ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {errors.confirmPassword && (
              <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Rol y especialidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rol del Usuario *
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 z-10" />
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as BackendRole)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-blue-200 bg-blue-50/30 text-slate-900 
                          focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none 
                          transition-all duration-200 appearance-none cursor-pointer
                          disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.emoji} {option.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Especialidad
            </label>
            <Input
              value={formData.speciality}
              onChange={(e) => handleInputChange('speciality', e.target.value)}
              placeholder="Ej: Cardiología, Pediatría..."
              leftIcon={Briefcase}
              variant="medical"
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">
              {formData.role === 'doctor' ? 'Recomendado para médicos' : 'Opcional'}
            </p>
          </div>
        </div>

        {/* Información del rol seleccionado */}
        {selectedRole && (
          <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-xl p-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{selectedRole.emoji}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">
                  Permisos del {selectedRole.label}
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedRole.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium px-6 py-2 rounded-xl transition-all duration-200 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Crear Usuario
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Hook para usar el modal
export function useCreateUserModal() {
  const { modals, openModal, closeModal } = useUIStore() 
  
  return {
    isOpen: modals.createUser,
    openModal: () => openModal('createUser'),
    closeModal: () => closeModal('createUser')
  }
}