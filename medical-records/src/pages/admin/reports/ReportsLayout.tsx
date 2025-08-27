// src/pages/admin/reports/ReportsLayout.tsx
import React from 'react'
import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { Shield, Monitor, FileText, Printer, Activity } from 'lucide-react'
import { clsx } from 'clsx'

const reportTabs = [
  
  {
    id: 'access',
    name: 'Accesos',
    href: '/admin/reports/access',
    icon: Monitor,
    description: 'Registro de accesos al sistema'
  },
  {
    id: 'modifications',
    name: 'Modificaciones',
    href: '/admin/reports/modifications',
    icon: FileText,
    description: 'Historial de cambios'
  },
  {
    id: 'medical-records',
    name: 'Historia clínica',
    href: '/admin/reports/medical-records',
    icon: Activity, // puedes cambiar a Stethoscope si lo importas
    description: 'Historia clínica por paciente'
  },

]
export default function ReportsLayout() {
  const location = useLocation()
  const isExactPath = (path: string) => location.pathname === path
  const isChildPath = (path: string) => location.pathname.startsWith(path + '/')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reportería de Seguridad</h1>
            <p className="text-slate-600">Monitoreo, auditoría y trazabilidad del sistema</p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
          {reportTabs.map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.href}
              className={({ isActive }) => clsx(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                isActive || isExactPath(tab.href) || isChildPath(tab.href)
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.name}</span>
            </NavLink>
          ))}
        </div>
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  )
}