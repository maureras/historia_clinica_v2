// src/components/layout/Header.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Menu, 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  User,
  ChevronDown 
} from 'lucide-react'
import { useAuthStore, useUIStore } from '@/stores'
import { Button } from '@/components/ui'
import { clsx } from 'clsx'

export default function Header() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const { toggleSidebar, sidebarOpen } = useUIStore()
  const [profileOpen, setProfileOpen] = React.useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="p-2"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-slate-900">
              Sistema Médico
            </h1>
          </div>
        </div>

        {/* Search Bar - Hidden on mobile */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
 
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">

          {/* Profile Dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-2"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="hidden md:block text-sm font-medium text-slate-700">
                {user?.firstName} {user?.lastName}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}