// src/components/ui/Button.tsx
import React, { forwardRef } from 'react'
import { Loader2, LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const buttonVariants = {
  variant: {
    primary: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl border-0',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl border-0',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl border-0',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-900',
    ghost: 'hover:bg-slate-100 text-slate-900 border-0'
  }
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        className={clsx(
          // Base styles
          'group inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-xl',
          'disabled:cursor-not-allowed disabled:opacity-60',
          
          // Variants
          {
            'bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 text-white shadow-sm hover:-translate-y-0.5 hover:shadow-xl focus:ring-blue-500': variant === 'primary',
            'bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-slate-500': variant === 'secondary',
            'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-sm hover:-translate-y-0.5 hover:shadow-xl focus:ring-red-500': variant === 'danger',
            'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:-translate-y-0.5 hover:shadow-xl focus:ring-emerald-500': variant === 'success',
            'border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-500': variant === 'outline',
            'text-slate-700 hover:bg-slate-100 focus:ring-slate-500': variant === 'ghost',
          },
          
          // Sizes
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2.5 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
            'px-8 py-4 text-lg': size === 'xl',
          },
          
          // Full width
          { 'w-full': fullWidth },
          
          className
        )}
        disabled={isDisabled}
        ref={ref}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && Icon && iconPosition === 'left' && (
          <Icon className={clsx(
            'transition-transform',
            { 'group-hover:translate-x-1': variant === 'primary' },
            {
              'h-3 w-3': size === 'sm',
              'h-4 w-4': size === 'md',
              'h-5 w-5': size === 'lg',
              'h-6 w-6': size === 'xl',
            }
          )} />
        )}
        {children}
        {!loading && Icon && iconPosition === 'right' && (
          <Icon className={clsx(
            'transition-transform',
            { 'group-hover:translate-x-1': variant === 'primary' },
            {
              'h-3 w-3': size === 'sm',
              'h-4 w-4': size === 'md',
              'h-5 w-5': size === 'lg',
              'h-6 w-6': size === 'xl',
            }
          )} />
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }