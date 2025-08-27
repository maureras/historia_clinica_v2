// src/pages/patients/PatientsList.tsx
import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Edit, MoreHorizontal, UserX, UserCheck, Calendar, IdCard, Mail, Phone, Droplet, FileText, Trash2 } from 'lucide-react'
import { Input, Card, Button, ConfirmationModal } from '@/components/ui'
import { useToast } from '@/components/ui/ToastNotifications'
import { usePatientsStore } from '@/stores'
import { useAuthStore } from '@/stores/authStore'
import EditPatientModal from './EditPatientModal'
import type { Patient } from '@/types'

function initials(p: Patient) {
  const a = (p.firstName || '').trim()
  const b = (p.lastName || '').trim()
  return `${a.charAt(0) || ''}${b.charAt(0) || ''}`.toUpperCase() || 'P'
}

function formatDate(d?: Date) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })
    .format(new Date(d))
}

function statusColor(isActive: boolean) {
  return isActive ? 'bg-green-500' : 'bg-red-500'
}

export default function PatientsList() {
  const navigate = useNavigate()
  const { patients, fetchPatients, updatePatient, deletePatient } = usePatientsStore()
  const { user } = useAuthStore()

  
  const canDelete = user?.role === 'admin'
  const canCreateConsultation = user?.role === 'admin' || user?.role === 'doctor'
  
  const toast = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [editing, setEditing] = useState<Patient | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // confirm modal (simple local)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<null | (() => void)>(null)
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; type?: 'danger' | 'warning' | 'success' } | null>(null)

  useEffect(() => { fetchPatients() }, [fetchPatients])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return patients
    return patients.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.documentNumber || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    )
  }, [patients, searchQuery])

  const activeCount = filtered.filter(p => p.isActive).length
  const inactiveCount = filtered.length - activeCount

  const openEdit = (p: Patient) => {
    setEditing(p)
    setIsEditOpen(true)
  }

  const onUserUpdate = () => {
    setIsEditOpen(false)
    setEditing(null)
  }

  const executeToggle = async (patientId: string) => {
    const p = patients.find(x => x.id === patientId)
    if (!p) return
    const newStatus = !p.isActive
    await updatePatient(patientId, { isActive: newStatus })
    if (newStatus) {
      toast.success('✅ Paciente activado', `${p.firstName} ${p.lastName} se marcó como activo`)
    } else {
      toast.warning('⚠️ Paciente desactivado', `${p.firstName} ${p.lastName} se marcó como inactivo`)
    }
  }

  const handleToggle = (patientId: string) => {
    // 🛡️ VALIDACIÓN DE PERMISOS
    if (!canDelete) {
      toast.error('No autorizado', 'Solo administradores pueden activar/desactivar pacientes')
      return
    }

    const p = patients.find(x => x.id === patientId)
    if (!p) return
    const isActivating = !p.isActive
    setConfirmConfig({
      title: isActivating ? '✅ Activar Paciente' : '⚠️ Desactivar Paciente',
      message: isActivating
        ? `¿Confirmas activar a ${p.firstName} ${p.lastName}?`
        : `¿Confirmas desactivar a ${p.firstName} ${p.lastName}?`,
      type: isActivating ? 'success' : 'warning'
    })
    setConfirmAction(() => () => executeToggle(patientId))
    setConfirmOpen(true)
  }

  const handleDelete = (patientId: string) => {
    const p = patients.find(x => x.id === patientId)
    if (!p) return
    if (!canDelete) {
      toast.error('No autorizado', 'Solo administradores pueden eliminar pacientes')
      return
    }
    setConfirmConfig({
      title: '🗑️ Eliminar paciente',
      message: `¿Confirmas eliminar a ${p.firstName} ${p.lastName}? Esta acción no se puede deshacer.`,
      type: 'danger'
    })
    setConfirmAction(() => async () => {
      try {
        await deletePatient(patientId)
        toast.success('Paciente eliminado', `${p.firstName} ${p.lastName} fue eliminado correctamente`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No autorizado o error al eliminar'
        toast.error('No se pudo eliminar', msg)
      }
    })
    setConfirmOpen(true)
  }

  // Nueva Consulta con validación de permisos
  const handleNewConsultation = (patientId: string) => {
    if (!canCreateConsultation) {
      toast.error('No autorizado', 'Solo administradores y doctores pueden crear consultas')
      return
    }
    navigate(`/consultations/new/${patientId}`)
  }

  return (
    <div className="space-y-6">
      <Card variant="medical" className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre, doc. o correo"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              leftIcon={Search}
              variant="medical"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>Mostrando {filtered.length} de {patients.length} pacientes</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {activeCount} activos
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              {inactiveCount} inactivos
            </span>
          </span>
        </div>
      </Card>

      {/* Lista de pacientes (cards) */}
      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No se encontraron pacientes</h3>
            <p className="text-slate-600">
              {searchQuery ? 'Intenta ajustar tu búsqueda' : 'No hay pacientes registrados en el sistema'}
            </p>
          </Card>
        ) : (
          filtered.map((p) => (
            <Card
              key={p.id}
              className={`p-4 rounded-xl shadow border transition ${p.isActive
                  ? 'bg-emerald-50 border-emerald-200 hover:shadow-md'
                  : 'bg-red-50 border-red-200 hover:shadow-md'
                }`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar / iniciales */}
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">
                  {initials(p)}
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusColor(p.isActive)} text-white`}>
                          {p.isActive ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${p.isActive ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                            {p.firstName} {p.lastName}
                          </h3>
                          {/* Blood type chip (si existe) */}
                          {p.bloodType && (
                            <span className="px-2 py-0.5 rounded-full border text-xs bg-cyan-50 text-cyan-700 border-cyan-200 flex items-center gap-1">
                              <Droplet className="h-3 w-3" /> {p.bloodType}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <IdCard className="h-4 w-4 text-indigo-600" />
                            <span className="capitalize">{p.documentType || '—'}</span>
                            <span className="text-slate-400">•</span>
                            <span>{p.documentNumber || '—'}</span>
                          </div>
                          {p.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="h-4 w-4 text-sky-600" />
                              <span>{p.email}</span>
                            </div>
                          )}
                          {p.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="h-4 w-4 text-emerald-600" />
                              <span>{p.phone}</span>
                            </div>
                          )}
                          <div className="text-xs text-slate-500">Alta: {formatDate(p.createdAt as unknown as Date)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      {/* Editar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(p)}
                        title="Editar pacientes"
                        className="text-sky-700 hover:text-sky-800 hover:bg-sky-50"
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                    {/* Activar/Desactivar - SOLO ADMIN */}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(p.id)}
                        className={p.isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                        title={p.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {p.isActive ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                      </Button>
                    )}

                      {/* Nueva Consulta - SOLO ADMIN Y DOCTOR */}
                      {canCreateConsultation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNewConsultation(p.id)}
                          title="Nueva consulta"
                        >
                          <Calendar className="h-5 w-5 text-purple-600" />
                        </Button>
                      )}

                      {/* Historia Clínica */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/records/medical/${p.id}`)}
                        title="Historia clínica"
                      >
                        <FileText className="h-5 w-5 text-amber-600" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar pacientes"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Edición */}
      <EditPatientModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        patient={editing}
        onUpdated={onUserUpdate}
      />

      {/* Confirmación */}
      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { confirmAction?.(); setConfirmOpen(false) }}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        type={confirmConfig?.type || 'warning'}
      />
    </div>
  )
}
