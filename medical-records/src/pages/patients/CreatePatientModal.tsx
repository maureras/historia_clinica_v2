// src/pages/patients/CreatePatientModal.tsx
import React, { useState } from 'react'
import { Modal, Button, Input, Card } from '@/components/ui'
import { usePatientsStore } from '@/stores'
import { useToast } from '@/components/ui/ToastNotifications'
import { Save, Shield, Mail, Phone, User, IdCard, CalendarDays, Droplet, CreditCard } from 'lucide-react'
import type { Gender, DocumentType, BloodType } from '@/types'
import PatientCardModal from './PatientCardModal'

type Props = { isOpen: boolean; onClose: () => void; onCreated?: () => void }

const genders: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
]

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'cedula', label: 'Cédula' },
  { value: 'dni', label: 'DNI' },
  { value: 'passport', label: 'Pasaporte' },
  { value: 'other', label: 'Otro' },
]

const bloodTypes: { value: BloodType; label: string }[] = [
  { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
  { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
]

const emergencyRelations = [
  { value: 'spouse', label: 'Cónyuge' },
  { value: 'parent', label: 'Padre/Madre' },
  { value: 'child', label: 'Hijo/Hija' },
  { value: 'sibling', label: 'Hermano/Hermana' },
  { value: 'friend', label: 'Amigo/Amiga' },
  { value: 'other', label: 'Otro' },
]

export default function CreatePatientModal({ isOpen, onClose, onCreated }: Props) {
  const { createPatient, isLoading } = usePatientsStore()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showPatientCard, setShowPatientCard] = useState(false)
  const [createdPatient, setCreatedPatient] = useState<any>(null)

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
    // Contacto de emergencia
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    emergencyContactEmail: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
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

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const patientData = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        documentType: form.documentType,
        documentNumber: form.documentNumber.trim(),
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth) : undefined,
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
        isActive: true,
      }
      
      const patient = await createPatient(patientData)
      setCreatedPatient(patient)
      setShowSuccess(true)
      
      toast.success('Paciente creado exitosamente', `${form.firstName} ${form.lastName} ha sido agregado al sistema`)
      // onCreated?.() // Removed: parent refresh should only happen on close
    } catch (error) {
      toast.error('Error al crear paciente', 'Hubo un problema al crear el paciente. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setErrors({})
    setShowSuccess(false)
    setShowPatientCard(false)
    setCreatedPatient(null)
    setForm({
      firstName: '', lastName: '', documentType: 'cedula', documentNumber: '',
      dateOfBirth: '', gender: 'male', phone: '', email: '', bloodType: '', allergies: '',
      emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '', emergencyContactEmail: ''
    })
    onCreated?.()
    onClose()
  }

  const handleGenerateCard = () => {
    setShowPatientCard(true)
  }

  const handleNewPatient = () => {
    setShowSuccess(false)
    setCreatedPatient(null)
    setForm({
      firstName: '', lastName: '', documentType: 'cedula', documentNumber: '',
      dateOfBirth: '', gender: 'male', phone: '', email: '', bloodType: '', allergies: '',
      emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '', emergencyContactEmail: ''
    })
  }

  // Modal de éxito
  if (showSuccess && createdPatient) {
    return (
      <>
        <Modal isOpen={true} onClose={handleClose} title="Paciente Creado Exitosamente" size="md">
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {createdPatient.firstName} {createdPatient.lastName}
              </h3>
              <p className="text-slate-600">Ha sido registrado exitosamente en el sistema</p>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
              <div className="flex items-center justify-center gap-3 mb-3">
                <CreditCard className="h-5 w-5 text-sky-600" />
                <span className="font-medium text-sky-900">Tarjeta de Paciente</span>
              </div>
              <p className="text-sm text-sky-700 text-center">
                Genera una tarjeta con código QR para acceso rápido a la historia clínica
              </p>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleNewPatient}>
                Crear Otro Paciente
              </Button>
              <Button onClick={handleGenerateCard} icon={CreditCard} className="bg-sky-600 hover:bg-sky-700">
                Generar Tarjeta
              </Button>
            </div>
          </div>
        </Modal>

        <PatientCardModal
          isOpen={showPatientCard}
          onClose={() => setShowPatientCard(false)}
          patient={createdPatient}
        />
      </>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Crear Nuevo Paciente" size="lg">
      <div className="space-y-6">
        {/* Alert informativa */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-sky-600" />
            <div>
              <h3 className="font-medium text-sky-900">Registro de Paciente</h3>
              <p className="text-sm text-sky-700">Completa los datos personales y clínicos básicos.</p>
            </div>
          </div>
        </div>

        {/* Información Personal */}
        <div className="space-y-4 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
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
              onChange={e => handleChange('gender', e.target.value as Gender)}
              className="w-full rounded-xl border border-sky-200 bg-sky-50/30 px-4 py-3 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all duration-200"
            >
              {genders.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de nacimiento</label>
              <div className="relative">
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => handleChange('dateOfBirth', e.target.value)}
                  leftIcon={CalendarDays}
                  variant="medical"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Grupo sanguíneo</label>
              <div className="relative">
                <select
                  value={form.bloodType}
                  onChange={e => handleChange('bloodType', e.target.value as '' | BloodType)}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 px-4 py-3 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all duration-200"
                >
                  <option value="">Selecciona…</option>
                  {bloodTypes.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
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
              onChange={e => handleChange('documentType', e.target.value as DocumentType)}
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

        {/* Botones */}
        <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={loading || isLoading} icon={Save} className="bg-sky-600 hover:bg-sky-700">
            Crear Paciente
          </Button>
        </div>
      </div>
    </Modal>
  )
}