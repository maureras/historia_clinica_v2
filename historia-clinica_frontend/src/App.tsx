// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AppShell from './layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HistoriaClinica from './pages/HistoriaClinica';
import NuevoPaciente from './pages/PacienteNuevo';
import NuevaConsulta from './pages/NuevaConsulta';

// Componente para rutas protegidas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

// Componente para rutas públicas (solo para usuarios no autenticados)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />

      {/* Rutas protegidas */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/historia" 
        element={
          <ProtectedRoute>
            <HistoriaClinica />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/paciente" 
        element={
          <ProtectedRoute>
            <NuevoPaciente />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/consulta" 
        element={
          <ProtectedRoute>
            <NuevaConsulta />
          </ProtectedRoute>
        } 
      />

      {/* Ruta catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;