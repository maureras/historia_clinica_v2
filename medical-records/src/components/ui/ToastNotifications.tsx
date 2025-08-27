// src/components/ui/ToastNotifications.tsx
import React from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useUIStore } from '@/stores'
import { clsx } from 'clsx'

interface ToastProps {
  notification: {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: Date
  }
  onDismiss: (id: string) => void
}

function Toast({ notification, onDismiss }: ToastProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Info className="h-5 w-5 text-slate-600" />
    }
  }

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900'
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-900'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900'
      default:
        return 'bg-slate-50 border-slate-200 text-slate-900'
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'relative flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out transform',
        'transition-transform translate-x-0',
        'pointer-events-none',
        getStyles()
      )}
    >
      {/* Icono */}
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold">{notification.title}</h4>
        <p className="text-sm opacity-90 mt-1">{notification.message}</p>
      </div>

      {/* Botón cerrar */}
      <button
        onClick={() => onDismiss(notification.id)}
        aria-label="Cerrar notificación"
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors pointer-events-auto"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Barra de progreso */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-current opacity-20 rounded-b-lg animate-pulse pointer-events-none"
        style={{ animation: 'progress 5s linear forwards' }}
      />

      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

export function ToastNotifications() {
  const notifications = useUIStore(state => state.notifications)
  const removeNotification = useUIStore(state => state.removeNotification)

  if (notifications.length === 0) return null

  const topNotifs = notifications.filter(n => n.type === 'error' || n.type === 'warning')
  const bottomNotifs = notifications.filter(n => n.type === 'success' || n.type === 'info')

  return createPortal(
    <>
      {/* Top-right: errores y advertencias (máxima visibilidad) */}
      {topNotifs.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] space-y-3 w-full max-w-sm pointer-events-none">
          {topNotifs.map((notification) => (
            <Toast
              key={notification.id}
              notification={notification}
              onDismiss={removeNotification}
            />
          ))}
        </div>
      )}

      {/* Bottom-right: éxitos e información (menos intrusivo) */}
      {bottomNotifs.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9999] space-y-3 w-full max-w-sm pointer-events-none">
          {bottomNotifs.map((notification) => (
            <Toast
              key={notification.id}
              notification={notification}
              onDismiss={removeNotification}
            />
          ))}
        </div>
      )}
    </>,
    document.body
  )
}

// Hook personalizado para mostrar notificaciones fácilmente
export function useToast() {
  const addNotification = useUIStore(state => state.addNotification)

  const toast = {
    success: (title: string, message: string) => {
      addNotification({ type: 'success', title, message })
    },
    error: (title: string, message: string) => {
      addNotification({ type: 'error', title, message })
    },
    warning: (title: string, message: string) => {
      addNotification({ type: 'warning', title, message })
    },
    info: (title: string, message: string) => {
      addNotification({ type: 'info', title, message })
    }
  }

  return toast
}