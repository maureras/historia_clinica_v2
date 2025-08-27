// src/pages/patients/EditPatientModal.tsx
import React, { useEffect, useState } from 'react'
import { Modal, Button, Input, Card } from '@/components/ui'
import { usePatientsStore } from '@/stores'
import { useToast } from '@/components/ui/ToastNotifications'
import { Save, X, User, Mail, Phone, IdCard, CalendarDays, Droplet, UserCheck, UserX, Shield, CreditCard } from 'lucide-react'
import type { Patient, Gender, BloodType, DocumentType } from '@/types'
import PatientCardModal from './PatientCardModal'

type Props = { isOpen: boolean; onClose: () => void; patient: Patient | null; onUpdated?: () => void }

const genders: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
]

const bloodTypes: { value: BloodType; label: string }[] = [
  { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
  { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
]

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'cedula', label: 'Cédula' },
  { value: 'dni', label: 'DNI' },
  { value: 'passport', label: 'Pasaporte' },
  { value: 'other', label: 'Otro' },
]

const emergencyRelations = [
  { value: 'spouse', label: 'Cónyuge' },
  { value: 'parent', label: 'Padre/Madre' },
  { value: 'child', label: 'Hijo/Hija' },
  { value: 'sibling', label: 'Hermano/Hermana' },
  { value: 'friend', label: 'Amigo/Amiga' },
  { value: 'other', label: 'Otro' },
]

function toDateInputValue(d?: Date | string | null) {
  if (!d) return ''
  // If backend sends a plain date string (YYYY-MM-DD) or ISO (YYYY-MM-DDTHH:mm:ssZ), avoid local TZ shifts
  if (typeof d === 'string') {
    const m = d.match(/^\d{4}-\d{2}-\d{2}/)
    return m ? m[0] : new Date(d).toISOString().slice(0, 10)
  }
  // If it's a Date object, convert using UTC to avoid off-by-one due to local timezone
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function EditPatientModal({ isOpen, onClose, patient, onUpdated }: Props) {
  const { updatePatient, isLoading } = usePatientsStore()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [showPatientCard, setShowPatientCard] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    documentType: 'cedula' as DocumentType,
    documentNumber: '',
    dateOfBirth: '',
    gender: 'male' as Gender,
    phone: '',
    email: '',
    bloodType: '' as '' | BloodType,
    allergies: '',
    isActive: true,
    // Contacto de emergencia
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    emergencyContactEmail: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (patient && isOpen) {
      setForm({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        documentType: (patient.documentType as DocumentType) || 'cedula',
        documentNumber: patient.documentNumber || '',
        dateOfBirth: toDateInputValue(patient.dateOfBirth as any),
        gender: (patient.gender as Gender) || 'male',
        phone: patient.phone || '',
        email: patient.email || '',
        bloodType: (patient.bloodType as BloodType) || '',
        allergies: (patient.allergies || []).join(', '),
        isActive: !!patient.isActive,
        // Contacto de emergencia
        emergencyContactName: patient.emergencyContact?.name || '',
        emergencyContactRelationship: patient.emergencyContact?.relationship || '',
        emergencyContactPhone: patient.emergencyContact?.phone || '',
        emergencyContactEmail: patient.emergencyContact?.email || '',
      })
      setErrors({})
    }
  }, [patient, isOpen])

  const handleChange = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value as any }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Nombres son requeridos'
    if (!form.lastName.trim()) e.lastName = 'Apellidos son requeridos'
    if (!form.documentNumber.trim()) e.documentNumber = 'Documento es requerido'
    if (!form.emergencyContactName.trim()) e.emergencyContactName = 'Contacto de emergencia es requerido'
    if (!form.emergencyContactPhone.trim()) e.emergencyContactPhone = 'Teléfono de emergencia es requerido'
    if (!form.emergencyContactRelationship.trim()) e.emergencyContactRelationship = 'Relación es requerida'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido'
    if (form.emergencyContactEmail && !/\S+@\S+\.\S+/.test(form.emergencyContactEmail)) e.emergencyContactEmail = 'Email de emergencia inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient) return
    if (!validate()) return

    setLoading(true)
    try {
      const dobISO = form.dateOfBirth ? new Date(`${form.dateOfBirth}T00:00:00.000Z`) : undefined
      await updatePatient(patient.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        documentType: form.documentType,
        documentNumber: form.documentNumber.trim(),
        // Send as a Date object in UTC to avoid TZ shifts on backend
        dateOfBirth: dobISO,
        gender: form.gender,
        phone: form.phone || undefined,
        email: form.email || undefined,
        bloodType: form.bloodType || undefined,
        allergies: form.allergies ? form.allergies.split(',').map(a => a.trim()).filter(Boolean) : [],
        emergencyContact: {
          name: form.emergencyContactName.trim(),
          relationship: form.emergencyContactRelationship,
          phone: form.emergencyContactPhone.trim(),
          email: form.emergencyContactEmail || undefined,
        },
        isActive: form.isActive,
      })
      toast.success('✅ Paciente actualizado', `Los datos de ${form.firstName} ${form.lastName} han sido actualizados`)
      onUpdated?.()
      onClose()
    } catch (error) {
      toast.error('❌ Error al actualizar', 'No se pudieron guardar los cambios. Inténtalo nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCard = () => {
    setShowPatientCard(true)
  }

  if (!patient) return null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Editar Paciente: ${patient.firstName} ${patient.lastName}`}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alert info */}
          <Card className="p-4 bg-sky-50 border-sky-200">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-sky-600 mt-0.5" />
              <div className="flex-1 text-sm text-sky-800">
                <p className="font-medium mb-1">Editando ficha del paciente</p>
                {patient.createdAt && (
                  <p className="text-sky-700">
                    Paciente creado el {new Intl.DateTimeFormat('es-EC', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    }).format(new Date(patient.createdAt))}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateCard}
                icon={CreditCard}
                className="border-sky-200 text-sky-700 hover:bg-sky-100"
              >
                Ver Tarjeta
              </Button>
            </div>
          </Card>

          {/* Personal */}
          <div className="space-y-4 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">Información Personal</h4>
                <p className="text-sm text-green-700">Datos generales del paciente.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombres *"
                value={form.firstName}
                onChange={e => handleChange('firstName', e.target.value)}
                error={errors.firstName}
                placeholder="Ej: Juan"
                variant="medical"
              />
              <Input
                label="Apellidos *"
                value={form.lastName}
                onChange={e => handleChange('lastName', e.target.value)}
                error={errors.lastName}
                placeholder="Ej: Pérez"
                variant="medical"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Género</label>
                <select
                  value={form.gender}
                  onChange={e => handleChange('gender', e.target.value)}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 px-4 py-3 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all duration-200"
                >
                  {genders.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de nacimiento</label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => handleChange('dateOfBirth', e.target.value)}
                  leftIcon={CalendarDays}
                  variant="medical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Grupo sanguíneo</label>
                <select
                  value={form.bloodType}
                  onChange={e => handleChange('bloodType', e.target.value)}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 px-4 py-3 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all duration-200"
                >
                  <option value="">Selecciona…</option>
                  {bloodTypes.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Documento y contacto */}
          <div className="space-y-4 bg-sky-50 border border-sky-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <IdCard className="h-5 w-5 text-sky-600" />
              <div>
                <h4 className="font-medium text-sky-900">Documento y Contacto</h4>
                <p className="text-sm text-sky-700">Datos de identificación y contacto del paciente.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de documento</label>
                <select
                  value={form.documentType}
                  onChange={e => handleChange('documentType', e.target.value)}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 px-4 py-3 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all duration-200"
                >
                  {documentTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <Input
                label="Nro. documento *"
                value={form.documentNumber}
                onChange={e => handleChange('documentNumber', e.target.value)}
                error={errors.documentNumber}
                placeholder="0102030405"
                variant="medical"
              />

              <Input
                label="Teléfono"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                leftIcon={Phone}
                placeholder="+593 99 123 4567"
                variant="medical"
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              leftIcon={Mail}
              error={errors.email}
              placeholder="paciente@clinica.com"
              variant="medical"
            />
          </div>

          {/* Contacto de emergencia */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-red-600" />
              Contacto de Emergencia
            </h3>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-5 w-5 text-red-600" />
                <div>
                  <h4 className="font-medium text-red-900">Información Crítica</h4>
                  <p className="text-sm text-red-700">Persona a contactar en caso de emergencia médica.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre completo *"
                    value={form.emergencyContactName}
                    onChange={e => handleChange('emergencyContactName', e.target.value)}
                    error={errors.emergencyContactName}
                    placeholder="Ej: María Pérez"
                    variant="medical"
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Relación *</label>
                    <select
                      value={form.emergencyContactRelationship}
                      onChange={e => handleChange('emergencyContactRelationship', e.target.value)}
                      className="w-full rounded-xl border border-sky-200 bg-sky-50/30 px-4 py-3 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all duration-200"
                    >
                      <option value="">Selecciona relación…</option>
                      {emergencyRelations.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    {errors.emergencyContactRelationship && (
                      <p className="mt-1 text-sm text-red-600">{errors.emergencyContactRelationship}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Teléfono *"
                    value={form.emergencyContactPhone}
                    onChange={e => handleChange('emergencyContactPhone', e.target.value)}
                    error={errors.emergencyContactPhone}
                    leftIcon={Phone}
                    placeholder="+593 99 987 6543"
                    variant="medical"
                  />
                  <Input
                    label="Email (opcional)"
                    type="email"
                    value={form.emergencyContactEmail}
                    onChange={e => handleChange('emergencyContactEmail', e.target.value)}
                    error={errors.emergencyContactEmail}
                    leftIcon={Mail}
                    placeholder="emergencia@email.com"
                    variant="medical"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3 p-4 bg-sky-50 rounded-xl border border-sky-200">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={e => handleChange('isActive', e.target.checked)}
              className="w-4 h-4 text-sky-600 bg-white border-sky-300 rounded focus:ring-sky-500 focus:ring-2"
            />
            <label htmlFor="isActive" className="flex items-center gap-2 text-sm font-medium text-slate-700">
              {form.isActive ? (
                <>
                  <UserCheck className="h-4 w-4 text-green-600" />
                  Paciente activo
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 text-red-600" />
                  Paciente inactivo
                </>
              )}
            </label>
          </div>

          {/* Botones */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onClose} className="sm:w-auto" fullWidth>
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading || isLoading} className="sm:w-auto bg-sky-600 hover:bg-sky-700" fullWidth>
              <Save className="h-4 w-4 mr-2" /> Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      <PatientCardModal
        isOpen={showPatientCard}
        onClose={() => setShowPatientCard(false)}
        patient={patient}
      />
    </>
  )
}