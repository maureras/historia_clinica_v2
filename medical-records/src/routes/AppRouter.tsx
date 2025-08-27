// src/routes/AppRouter.tsx
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/Dashboard'
import PatientsPage from '@/pages/patients/PatientsPage'
import MedicalRecord from '@/pages/records/MedicalRecord'
import { UsersPage } from '@/pages/admin/users'
import NewConsultation from '@/pages/consultations/NewConsultation'
import ConsultationDetail from '@/pages/consultations/ConsultationDetail'
import ReportsLayout from '@/pages/admin/reports/ReportsLayout'
import SecurityDashboard from '@/pages/admin/reports/SecurityDashboard'
import AccessReports from '@/pages/admin/reports/AccessReports'
import ModificationReports from '@/pages/admin/reports/ModificationReports'
import MedicalRecordsReportPage from '@/pages/admin/reports/MedicalRecordsReportPage'
// RUTA PRIVADA que guarda la URL de origen
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const location = useLocation()
  // ⬇️ Si no está logueado, mandamos a /login guardando “from”
  return isAuthenticated
    ? <>{children}</>
    : <Navigate to="/login" replace state={{ from: location }} />
}

// RUTA PÚBLICA que, si ya hay sesión, vuelve a la URL de origen
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const location = useLocation() as any
  // ⬇️ Si venías de una ruta protegida, vuelve allí tras login
  const from = location.state?.from?.pathname || '/dashboard'
  return isAuthenticated ? <Navigate to={from} replace /> : <>{children}</>
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login público con retorno */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />



        {/* Rutas privadas con layout */}
        <Route path="/" element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Pacientes */}
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:id/record" element={<MedicalRecord />} />
          <Route path="pacientes" element={<PatientsPage />} />
          <Route path="records/medical/:patientId" element={<MedicalRecord />} />

          {/* Consultas */}
          <Route path="consultations/new/:patientId" element={<NewConsultation />} />
          <Route path="consultations/view/:consultationId" element={<ConsultationDetail />} />

          {/* Admin */}
          <Route path="admin/users" element={<UsersPage />} />
          <Route path="admin/reports" element={<ReportsLayout />}>
            <Route index element={<SecurityDashboard />} />
            <Route path="access" element={<AccessReports />} />
            <Route path="modifications" element={<ModificationReports />} />
  <Route path="medical-records" element={<MedicalRecordsReportPage />} />

          </Route>

          {/* ✅ Rutas de seguridad actualizadas (alias) */}
          <Route path="admin/security" element={<SecurityDashboard />} />
          <Route path="admin/security/access" element={<AccessReports />} />
          <Route path="admin/security/modifications" element={<ModificationReports />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}