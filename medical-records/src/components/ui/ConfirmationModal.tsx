// src/components/ui/ConfirmationModal.tsx
import React from 'react'
import { AlertTriangle, CheckCircle, X, AlertCircle } from 'lucide-react'
import { Modal, Button } from '@/components/ui'
import { clsx } from 'clsx'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info' | 'success'
  loading?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  loading = false
}: ConfirmationModalProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertCircle className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-600" />
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'info':
        return <AlertCircle className="h-6 w-6 text-blue-600" />
      default:
        return <AlertTriangle className="h-6 w-6 text-amber-600" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-900',
          buttonVariant: 'primary' as const,
          buttonColor: 'bg-red-600 hover:bg-red-700 text-white'
        }
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-900',
          buttonVariant: 'primary' as const,
          buttonColor: 'bg-amber-600 hover:bg-amber-700 text-white'
        }
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-900',
          buttonVariant: 'primary' as const,
          buttonColor: 'bg-green-600 hover:bg-green-700 text-white'
        }
      case 'info':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-900',
          buttonVariant: 'primary' as const,
          buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
      default:
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-900',
          buttonVariant: 'primary' as const,
          buttonColor: 'bg-amber-600 hover:bg-amber-700 text-white'
        }
    }
  }

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  // ✅ CORRECCIÓN: Llamar la función getStyles()
  const styles = getStyles()

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={title}
      size="md"
    >
      <div className="space-y-6">
        {/* Alert visual */}
        <div className={clsx(
          'rounded-xl p-4 border',
          styles.bg
        )}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            <div className={clsx('flex-1', styles.text)}>
              <h3 className="font-medium text-sm mb-1">Confirmación requerida</h3>
              <p className="text-sm opacity-90 whitespace-pre-line">{message}</p>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Esta acción se puede revertir posteriormente.</span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            fullWidth
            className="sm:w-auto"
            disabled={loading}
          >
            {cancelText}
          </Button>
          
          {/* ✅ BOTÓN CON ESTILO CORRECTO */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={clsx(
              'px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto',
              styles.buttonColor,
              'focus:ring-2 focus:ring-offset-2',
              type === 'danger' && 'focus:ring-red-500',
              type === 'warning' && 'focus:ring-amber-500',
              type === 'success' && 'focus:ring-green-500',
              type === 'info' && 'focus:ring-blue-500'
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Procesando...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Hook para usar el modal de confirmación
export function useConfirmationModal() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<{
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'warning' | 'danger' | 'info' | 'success'
    onConfirm: () => void
  } | null>(null)

  const confirm = React.useCallback((options: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'warning' | 'danger' | 'info' | 'success'
    onConfirm: () => void
  }) => {
    setConfig(options)
    setIsOpen(true)
  }, [])

  const close = React.useCallback(() => {
    setIsOpen(false)
    setTimeout(() => setConfig(null), 300) // Delay para la animación
  }, [])

  return {
    isOpen,
    config,
    confirm,
    close
  }
}