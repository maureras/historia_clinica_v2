// src/layout/AppShell.tsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  FileText, 
  UserPlus, 
  Stethoscope, 
  LogOut, 
  User, 
  ChevronDown, 
  Activity, 
  Shield,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import Watermark from "../components/ui/Watermark"; // Ajustada la ruta

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const menuItems = [
    { label: "Dashboard", icon: <Home className="h-5 w-5" />, path: "/", roles: ['ADMIN', 'MEDICO', 'ENFERMERA', 'ADMINISTRATIVO'] },
    { label: "Nuevo Paciente", icon: <UserPlus className="h-5 w-5" />, path: "/paciente", roles: ['ADMIN', 'MEDICO', 'ENFERMERA'] },
    { label: "Nueva Consulta", icon: <Stethoscope className="h-5 w-5" />, path: "/consulta", roles: ['ADMIN', 'MEDICO'] },
    { label: "Historia Clínica", icon: <FileText className="h-5 w-5" />, path: "/historia", roles: ['ADMIN', 'MEDICO', 'ENFERMERA', 'ADMINISTRATIVO'] },
  ];

  const allowedItems = menuItems.filter(item => user && item.roles.includes(user.rol));

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error en logout:", error);
    }
  };

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MEDICO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ENFERMERA': return 'bg-green-100 text-green-800 border-green-200';
      case 'ADMINISTRATIVO': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleIcon = (rol: string) => {
    switch (rol) {
      case 'ADMIN': return <Shield className="h-4 w-4" />;
      case 'MEDICO': return <Stethoscope className="h-4 w-4" />;
      case 'ENFERMERA': return <Activity className="h-4 w-4" />;
      case 'ADMINISTRATIVO': return <User className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y título */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Historia Clínica</h1>
            </div>

            {/* Navegación desktop */}
            <nav className="hidden md:flex items-center gap-6">
              {allowedItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActiveRoute(item.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-white-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Menú de usuario */}
            <div className="flex items-center gap-4">
              {/* Botón móvil */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {/* Usuario */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-white-900">
                        {user?.nombres} {user?.apellidos}
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadgeColor(user?.rol || '')}`}>
                        {user?.rol}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {/* Dropdown del usuario */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          {getRoleIcon(user?.rol || '')}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {user?.nombres} {user?.apellidos}
                          </div>
                          <div className="text-sm text-slate-500">{user?.email}</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navegación móvil */}
      {showMobileMenu && (
        <div className="md:hidden bg-white border-b border-slate-200">
          <nav className="px-4 py-2 space-y-1">
            {allowedItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActiveRoute(item.path)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Contenido principal */}
      <main className="flex-1">
        {children}
      </main>

      {/* Marca de agua del usuario autenticado */}
      <Watermark model="diagonal" intensity={0.8} animation="none" />

      {/* Click outside para cerrar menus */}
      {(showUserMenu || showMobileMenu) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowUserMenu(false);
            setShowMobileMenu(false);
          }} 
        />
      )}
    </div>
  );
}