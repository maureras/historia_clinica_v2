// src/pages/patients/PatientsPage.tsx
import React from 'react'
import { UserPlus, Users, Activity, HeartPulse } from 'lucide-react' // <-- quité Shield, no se usaba
import { Button, Card } from '@/components/ui'
import { usePatientsStore } from '@/stores'
import PatientsList from './PatientsList'
import CreatePatientModal from './CreatePatientModal'

export default function PatientsPage() {
  // ✅ suscripción reactiva al store (re-renderiza al cargar pacientes)
  const patients = usePatientsStore(state => state.patients) || []
  const [openCreate, setOpenCreate] = React.useState(false)

  const totalPatients = patients.length
  const activePatients = patients.filter(p => p?.isActive).length
  const inactivePatients = totalPatients - activePatients

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const newThisMonth = patients.filter(p => {
    const created = p?.createdAt ? new Date(p.createdAt) : null
    return created && created.getMonth() === currentMonth && created.getFullYear() === currentYear
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Pacientes</h1>
          <p className="text-slate-600">Administra tus pacientes y su información clínica</p>
        </div>
        <Button onClick={() => setOpenCreate(true)} icon={UserPlus} size="lg" className="bg-sky-600 hover:bg-sky-700">
          Crear Paciente
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-indigo-50 border border-indigo-200 rounded-xl shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-indigo-100 ring-4 ring-indigo-50">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Pacientes</p>
              <p className="text-2xl font-bold text-slate-900">{totalPatients}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-100 ring-4 ring-emerald-50">
              <Activity className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pacientes Activos</p>
              <p className="text-2xl font-bold text-slate-900">{activePatients}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-red-50 border border-red-200 rounded-xl shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-100 ring-4 ring-red-50">
              <Activity className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pacientes Inactivos</p>
              <p className="text-2xl font-bold text-slate-900">{inactivePatients}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-sky-50 border border-sky-200 rounded-xl shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-sky-100 ring-4 ring-sky-50">
              <HeartPulse className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Nuevos (Este Mes)</p>
              <p className="text-2xl font-bold text-slate-900">{newThisMonth}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista */}
      <PatientsList />

      {/* Modal Crear */}
      <CreatePatientModal
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => {}}
      />
    </div>
  )
}