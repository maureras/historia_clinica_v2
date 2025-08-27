// src/components/ui/Input.tsx
import React, { forwardRef, useState } from 'react'
import { Eye, EyeOff, LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  variant?: 'default' | 'medical'
  inputSize?: 'sm' | 'md' | 'lg'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    type,
    label,
    error,
    helperText,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    variant = 'default',
    inputSize = 'md',
    id,
    disabled,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type
    const hasError = !!error
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {LeftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <LeftIcon className="h-5 w-5 text-slate-400" />
            </span>
          )}
          
          <input
            type={inputType}
            id={inputId}
            className={clsx(
              // Base styles
              'w-full rounded-xl border bg-white text-slate-900 placeholder-slate-400',
              'transition-all duration-200 hover:border-slate-300',
              'focus:outline-none focus:ring-2',
              
              // Variants
              {
                'border-slate-200 focus:border-blue-500 focus:ring-blue-500': variant === 'default' && !hasError,
                'border-blue-200 bg-blue-50/30 focus:border-blue-500 focus:ring-blue-500': variant === 'medical' && !hasError,
              },
              
              // Error state
              {
                'border-rose-300 focus:border-rose-400 focus:ring-rose-400': hasError,
              },
              
              // Sizes
              {
                'py-2 text-sm': inputSize === 'sm',
                'py-3 text-sm': inputSize === 'md',
                'py-4 text-base': inputSize === 'lg',
              },
              
              // Padding for icons
              {
                'pl-10': LeftIcon,
                'pr-10': RightIcon || isPassword,
                'px-3': !LeftIcon && !RightIcon && !isPassword,
                'pl-10 pr-10': LeftIcon && (RightIcon || isPassword),
              },
              
              // Disabled state
              'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50',
              
              className
            )}
            disabled={disabled}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          
          {/* Password toggle or right icon */}
          {(isPassword || RightIcon) && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {isPassword ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              ) : RightIcon ? (
                <RightIcon className="h-5 w-5 text-slate-400" />
              ) : null}
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-rose-600">
            {error}
          </p>
        )}
        
        {/* Helper text */}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
