// Componente Login con credenciales de prueba mostradas

import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react'
import { Button, Input, Card, Alert } from '@/components/ui'
import { useAuthStore, DEMO_CREDENTIALS } from '@/stores'

export default function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    try {
      await login(email, password)
    } catch (error) {
      // Error ya manejado en el store
    }
  }

  const quickLogin = (role: keyof typeof DEMO_CREDENTIALS) => {
    const credentials = DEMO_CREDENTIALS[role]
    setEmail(credentials.email)
    setPassword(credentials.password)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Sistema Médico
          </h1>
          <p className="text-slate-600">
            Inicia sesión para acceder al sistema
          </p>
        </div>



        {/* Login Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                {error}
              </Alert>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              leftIcon={Mail}
              variant="medical"
              required
            />

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                leftIcon={Lock}
                variant="medical"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              className="mt-6"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-500">
          <p>🔧 Desarrollador Mauro Galarraga</p>
        </div>
      </div>
    </div>
  )
}