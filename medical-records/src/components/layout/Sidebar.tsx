// src/components/layout/Sidebar.tsx
import React from 'react'
import { useLocation } from 'react-router-dom'
import { 
  LayoutDashboard,
  Users,
  FileText,
  Stethoscope,
  Activity,
  UserCog,
  Shield,
  BarChart3
} from 'lucide-react'
import { useUIStore, useAuthStore } from '@/stores'
import Navigation from './Navigation'
import { clsx } from 'clsx'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Vista general del sistema'
  },
  {
    name: 'Pacientes',
    href: '/patients',
    icon: Users,
    description: 'Gestión de pacientes'
  },
]

// Items de administración (solo para admins)
const adminNavigationItems = [
  {
    name: 'Gestión de Usuarios',
    href: '/admin/users',
    icon: UserCog,
    description: 'Administrar usuarios del sistema'
  },
  {
    name: 'Reportes de Seguridad',
    href: '/admin/reports/access',
    icon: Shield,
    description: 'Auditoría y trazabilidad'
  }
]

export default function Sidebar() {
  const location = useLocation()
  const sidebarOpen = useUIStore(state => state.sidebarOpen)
  const { user: currentUser } = useAuthStore()

  return (
    <aside className={clsx(
      'fixed left-0 top-16 bottom-0 z-30 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out',
      {
        'w-64': sidebarOpen,
        'w-16': !sidebarOpen,
      }
    )}>
      <div className="flex flex-col h-full">
        {/* Logo/Brand Section */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0">
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h2 className="text-sm font-semibold text-slate-900">ClinicaPro</h2>
                <p className="text-xs text-slate-500">Sistema Médico</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {/* Navegación principal */}
          {navigationItems.map((item) => (
            <Navigation
              key={item.href}
              item={item}
              isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '/')}
              isCollapsed={!sidebarOpen}
            />
          ))}

          {/* Sección de administración - Solo para admins */}
{String(currentUser?.role ?? '').toLowerCase() === 'admin' && (            <>
              {sidebarOpen && (
                <div className="px-3 py-2 pt-6">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Administración
                  </h3>
                </div>
              )}
              
              {adminNavigationItems.map((item) => (
                <Navigation
                  key={item.href}
                  item={item}
                  isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '/')}
                  isCollapsed={!sidebarOpen}
                />
              ))}
            </>
          )}
        </nav>

        {/* Status Section */}
        {sidebarOpen && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Activity className="h-4 w-4" />
              <span>Sistema Activo</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}