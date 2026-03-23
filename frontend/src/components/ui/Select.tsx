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
  ...props
}, ref) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`
          w-full px-3 py-2 text-sm border rounded-lg shadow-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed bg-white
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
})

Select.displayName = 'Select'
