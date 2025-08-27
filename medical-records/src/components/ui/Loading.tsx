// src/components/ui/Loading.tsx
import React from 'react'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <Loader2 className={clsx(
      'animate-spin text-blue-600',
      {
        'h-4 w-4': size === 'sm',
        'h-6 w-6': size === 'md',
        'h-8 w-8': size === 'lg',
        'h-12 w-12': size === 'xl',
      },
      className
    )} />
  )
}

export interface LoadingSkeletonProps {
  className?: string
  lines?: number
}

export function LoadingSkeleton({ className, lines = 1 }: LoadingSkeletonProps) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'h-4 rounded-md bg-slate-200 animate-pulse',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

export interface LoadingOverlayProps {
  children?: React.ReactNode
  className?: string
}

export function LoadingOverlay({ children, className }: LoadingOverlayProps) {
  return (
    <div className={clsx(
      'flex items-center justify-center p-8',
      className
    )}>
      <div className="text-center space-y-3">
        <LoadingSpinner size="lg" />
        {children && (
          <p className="text-sm text-slate-600">{children}</p>
        )}
      </div>
    </div>
  )
}
