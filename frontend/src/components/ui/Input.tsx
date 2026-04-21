import React, { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  required,
  className = '',
  id,
  style,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: 2,
            fontFamily: 'var(--font-body)',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        style={{
          width: '100%',
          padding: '0 12px',
          height: 40,
          fontSize: 13,
          borderRadius: 8,
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          background: error ? 'rgba(220,38,38,0.04)' : 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          outline: 'none',
          transition: 'border-color 150ms, box-shadow 150ms',
          ...style,
        }}
        className={className}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,107,230,0.12)'
          onFocus?.(e)
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--border)'
          e.currentTarget.style.boxShadow = 'none'
          onBlur?.(e)
        }}
        {...props}
      />
      {error && (
        <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2, fontFamily: 'var(--font-body)' }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-body)' }}>
          {helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
