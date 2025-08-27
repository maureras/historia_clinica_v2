// src/components/layout/AppLayout.tsx
import React from 'react'
import { Outlet } from 'react-router-dom'
import { useUIStore } from '@/stores'
import Header from './Header'
import Sidebar from './Sidebar'
import { ToastNotifications } from '@/components/ui/ToastNotifications'
import { clsx } from 'clsx'
import Watermark from '@/components/common/Watermark'

export default function AppLayout() {
  const sidebarOpen = useUIStore(state => state.sidebarOpen)

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Contenido principal */}
      <div className="relative">
        {/* Header */}
        <Header />

        <div className="flex">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <main
            className={clsx(
              'flex-1 transition-all duration-300 ease-in-out',
              'pt-16', // Compensar altura del header
              {
                'ml-64': sidebarOpen,
                'ml-16': !sidebarOpen,
              }
            )}
          >
            <div className="p-6">
              <Outlet />
            </div>
          </main>

          {/* Toast Notifications - Posicionado globalmente */}
          <ToastNotifications />
        </div>
      </div>
      {/* Marca de agua global (encima de todo, no bloquea interacción) */}
      <Watermark />
    </div>
  )
}
