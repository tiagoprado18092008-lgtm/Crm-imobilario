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
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}
        >
          {label}
          {required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: 13,
          borderRadius: 8,
          border: `1px solid ${error ? '#f87171' : 'var(--input-border)'}`,
          background: error ? 'rgba(239,68,68,0.06)' : 'var(--input-bg)',
          color: 'var(--text-primary)',
          outline: 'none',
          transition: 'border-color 150ms',
          ...style,
        }}
        className={className}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#c9a84c'; props.onFocus?.(e) }}
        onBlur={(e) => { e.currentTarget.style.borderColor = error ? '#f87171' : 'var(--input-border)'; props.onBlur?.(e) }}
        {...props}
      />
      {error && <p style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{error}</p>}
      {helperText && !error && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{helperText}</p>}
    </div>
  )
})

Input.displayName = 'Input'
