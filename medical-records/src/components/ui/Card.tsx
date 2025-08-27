// src/components/ui/Card.tsx
import React, { forwardRef } from 'react'
import { clsx } from 'clsx'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'medical' | 'elevated' | 'bordered'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', hover = false, children, ...props }, ref) => {
    return (
      <div
        className={clsx(
          // Base styles
          'rounded-xl bg-white transition-all duration-300',
          
          // Variants
          {
            'border border-slate-200 shadow-sm': variant === 'default',
            'border border-blue-100 shadow-lg bg-gradient-to-br from-white to-blue-50/30': variant === 'medical',
            'shadow-xl border border-slate-100': variant === 'elevated',
            'border-2 border-slate-200': variant === 'bordered',
          },
          
          // Hover effects
          {
            'hover:shadow-lg hover:-translate-y-0.5': hover && variant === 'default',
            'hover:shadow-xl hover:-translate-y-1': hover && variant === 'medical',
            'hover:shadow-2xl': hover && variant === 'elevated',
          },
          
          // Padding
          {
            'p-0': padding === 'none',
            'p-4': padding === 'sm',
            'p-6': padding === 'md',
            'p-8': padding === 'lg',
            'p-10': padding === 'xl',
          },
          
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card }