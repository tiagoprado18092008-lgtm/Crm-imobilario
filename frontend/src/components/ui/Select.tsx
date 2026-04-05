import React, { forwardRef } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  error?: string
  placeholder?: string
  required?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options,
  error,
  placeholder,
  required,
  className = '',
  id,
  style,
  ...props
}, ref) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}
        >
          {label}
          {required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: 13,
          borderRadius: 8,
          border: `1px solid ${error ? '#f87171' : 'var(--input-border)'}`,
          background: 'var(--input-bg)',
          color: 'var(--text-primary)',
          outline: 'none',
          transition: 'border-color 150ms',
          ...style,
        }}
        className={className}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{error}</p>}
    </div>
  )
})

Select.displayName = 'Select'
