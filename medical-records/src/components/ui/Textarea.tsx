// src/components/ui/Textarea.tsx
import React, { forwardRef } from 'react'
import { clsx } from 'clsx'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  variant?: 'default' | 'medical'
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className,
    label,
    error,
    helperText,
    variant = 'default',
    resize = 'vertical',
    id,
    disabled,
    ...props 
  }, ref) => {
    const hasError = !!error
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={textareaId} 
            className="block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        
        <textarea
          id={textareaId}
          className={clsx(
            // Base styles
            'w-full rounded-xl border bg-white text-slate-900 placeholder-slate-400',
            'transition-all duration-200 hover:border-slate-300',
            'focus:outline-none focus:ring-2 px-3 py-3 text-sm',
            
            // Variants
            {
              'border-slate-200 focus:border-blue-500 focus:ring-blue-500': variant === 'default' && !hasError,
              'border-blue-200 bg-blue-50/30 focus:border-blue-500 focus:ring-blue-500': variant === 'medical' && !hasError,
            },
            
            // Error state
            {
              'border-rose-300 focus:border-rose-400 focus:ring-rose-400': hasError,
            },
            
            // Resize
            {
              'resize-none': resize === 'none',
              'resize-y': resize === 'vertical',
              'resize-x': resize === 'horizontal',
              'resize': resize === 'both',
            },
            
            // Disabled state
            'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50',
            
            className
          )}
          disabled={disabled}
          ref={ref}
          aria-invalid={hasError}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          {...props}
        />
        
        {/* Error message */}
        {error && (
          <p id={`${textareaId}-error`} className="text-sm text-rose-600">
            {error}
          </p>
        )}
        
        {/* Helper text */}
        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }