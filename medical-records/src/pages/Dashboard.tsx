// src/pages/Dashboard.tsx
import React from 'react'
import { Users, Activity, Stethoscope } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { useAuthStore } from '@/stores'
import CreatePatientModal from './patients/CreatePatientModal'
import { useNavigate } from 'react-router-dom'

type OverviewResponse = {
  range: { from: string | Date; to: string | Date }
  totals: { patients: number; consultations: number; labs: number; abnormalLabs: number }
  consultationsByEstado: Record<string, number>
  abnormalRate: string
}

export default function Dashboard() {
  // === Auth: selectores con primitivos (sin objetos) ===
  const currentUser = useAuthStore((s: any) => (s?.user ?? null))
  const roleKey = useAuthStore((s: any) => {
    const u = (s as any)?.user ?? {}
    const names: string[] = []
    const pushName = (v: any) => { if (v) names.push(String(v)) }

    pushName((u as any).rol)
    pushName((u as any).role)
    pushName((u as any).perfil)

    if (Array.isArray((u as any).roles)) {
      for (const r of (u as any).roles) {
        if (typeof r === 'string') pushName(r)
        else if (r && ((r as any).name || (r as any).nombre)) pushName((r as any).name || (r as any).nombre)
      }
    }

    if (typeof (u as any).roleId === 'number') {
      const mapById: Record<number, string> = { 1: 'ADMIN', 2: 'MEDICO', 3: 'DOCTOR', 4: 'ENFERMERA' }
      if (mapById[(u as any).roleId]) pushName(mapById[(u as any).roleId])
    }

    return names.map(n => n.trim().toUpperCase()).filter(Boolean).sort().join('|')
  })

  const canSeeConsult = React.useMemo(() => {
    const allowed = new Set(['ADMIN', 'MEDICO', 'DOCTOR'])
    return roleKey.split('|').some(t => allowed.has(t))
  }, [roleKey])

  const canSeeReports = React.useMemo(() => {
    // Define exactamente quién puede ver los reportes
    const allowed = new Set(['ADMIN', 'MEDICO', 'DOCTOR'])
    return roleKey.split('|').some(t => allowed.has(t))
  }, [roleKey])

  const navigate = useNavigate()
  const [openCreate, setOpenCreate] = React.useState(false)

  const [totalPatients, setTotalPatients] = React.useState<number>(0)
  const [activePatients, setActivePatients] = React.useState<number>(0)

  React.useEffect(() => {
    const API = import.meta.env.VITE_API_URL || ''
    const token = localStorage.getItem('token') || ''

    // Pacientes activos (suele estar permitido para más roles; si tu API lo restringe,  aplícale un gate similar)
    fetch(`${API}/api/patients`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`patients ${r.status}`)
        const patients = await r.json()
        const active = Array.isArray(patients) ? patients.filter((p) => p?.isActive).length : 0
        const total = Array.isArray(patients) ? patients.length : 0
        setActivePatients(active)
        if (!canSeeReports) {
          setTotalPatients(total)
        }
      })
      .catch(() => {
        setActivePatients(0)
      })

    // Reportes: SOLO si el rol está autorizado
    if (canSeeReports) {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      const end = new Date(); end.setHours(23, 59, 59, 999)
      const toISO = (d: Date) => d.toISOString().slice(0, 10)

      fetch(`${API}/api/reports/overview?from=${toISO(start)}&to=${toISO(end)}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`overview ${r.status}`)
          const data: OverviewResponse = await r.json()
          setTotalPatients(data?.totals?.patients ?? 0)
        })
        .catch(() => {
          setTotalPatients(0)
        })
    } else {
      // Si no puede ver reportes, aseguramos que no se quede mostrando errores ni loaders
      setTotalPatients(0)
    }
  }, [canSeeReports])

  return (
    <div className="space-y-6">
      <Card variant="medical" hover>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-600">Sistema Medico</p>
            <p className="text-2xl text-emerald-600">
              Bienvenido: {currentUser ? ` ${currentUser.firstName || ''}` : ''}
            </p>
            <p className="text-sm text-slate-600">
              Gestiona tus pacientes, registros clínicos y consultas desde aquí.
            </p>
          </div>
          <Stethoscope className="h-8 w-8 text-green-600" />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="lg:col-span-1 w-full">
          <Card variant="default" className="w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Acciones Rápidas</h3>
            <div className="space-y-3">
              <Button
                onClick={() => setOpenCreate(true)}
                variant="primary"
                fullWidth
                icon={Users}
                className="bg-sky-600 hover:bg-sky-700"
              >
                Registrar Nuevo Paciente
              </Button>

              {canSeeConsult && (
                <Button
                  variant="outline"
                  fullWidth
                  icon={Stethoscope}
                  onClick={() => navigate('/patients')}
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  Consulta Médica
                </Button>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:col-span-1">
          <Card variant="medical" hover padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pacientes Total</p>
                <p className="text-2xl font-bold text-slate-900">{totalPatients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card variant="medical" hover padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pacientes Activos</p>
                <p className="text-2xl font-bold text-slate-900">{activePatients}</p>
              </div>
              <Activity className="h-8 w-8 text-cyan-600" />
            </div>
          </Card>
        </div>
      </div>

      <CreatePatientModal
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => setOpenCreate(false)}
      />
    </div>
  )
}