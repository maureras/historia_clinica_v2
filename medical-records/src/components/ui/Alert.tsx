// src/components/ui/Alert.tsx
import React from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'
import { clsx } from 'clsx'

export interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  children: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

const alertConfig = {
  success: {
    icon: CheckCircle,
    styles: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: AlertCircle,
    styles: 'border-rose-200 bg-rose-50 text-rose-700',
    iconColor: 'text-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    styles: 'border-amber-200 bg-amber-50 text-amber-700',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: Info,
    styles: 'border-blue-200 bg-blue-50 text-blue-700',
    iconColor: 'text-blue-500',
  },
}

export function Alert({ 
  variant = 'info', 
  title, 
  children, 
  dismissible = false, 
  onDismiss,
  className 
}: AlertProps) {
  const config = alertConfig[variant]
  const Icon = config.icon

  return (
    <div className={clsx(
      'flex items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-200',
      config.styles,
      className
    )}>
      <Icon className={clsx('mt-0.5 h-5 w-5 flex-shrink-0', config.iconColor)} />
      
      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-sm font-medium mb-1">{title}</p>
        )}
        <div className={clsx('text-sm', { 'opacity-90': !title })}>
          {children}
        </div>
      </div>
      
      {dismissible && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
