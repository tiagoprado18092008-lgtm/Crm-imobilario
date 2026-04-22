import React, { forwardRef, useState, useRef, useEffect, useId } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
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
  value,
  defaultValue,
  onChange,
  disabled,
  ...props
}, ref) => {
  const uid = useId()
  const selectId = id || uid

  // Controlled vs uncontrolled: track current display value
  const [internalValue, setInternalValue] = useState<string>(
    (value as string) ?? (defaultValue as string) ?? ''
  )
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // hidden real select for form compatibility
  const hiddenRef = useRef<HTMLSelectElement>(null)

  // Sync if controlled from outside (react-hook-form sets value via ref)
  useEffect(() => {
    if (value !== undefined) setInternalValue(value as string)
  }, [value])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allOptions: SelectOption[] = placeholder
    ? [{ value: '', label: placeholder }, ...options]
    : options

  const selected = allOptions.find(o => o.value === internalValue)

  const handleSelect = (opt: SelectOption) => {
    setInternalValue(opt.value)
    setOpen(false)

    // Fire native change event on the hidden select so react-hook-form picks it up
    if (hiddenRef.current) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLSelectElement.prototype, 'value'
      )?.set
      nativeInputValueSetter?.call(hiddenRef.current, opt.value)
      hiddenRef.current.dispatchEvent(new Event('change', { bubbles: true }))
    }

    // Also call onChange if provided directly
    if (onChange) {
      const syntheticEvent = {
        target: { value: opt.value },
        currentTarget: { value: opt.value },
      } as React.ChangeEvent<HTMLSelectElement>
      onChange(syntheticEvent)
    }
  }

  const isPlaceholder = !internalValue

  return (
    <div className={`flex flex-col gap-1 ${className}`} style={{ position: 'relative' }} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}
        >
          {label}
          {required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
        </label>
      )}

      {/* Hidden native select for react-hook-form */}
      <select
        ref={(el) => {
          // Forward to both internal ref and external ref
          ;(hiddenRef as React.MutableRefObject<HTMLSelectElement | null>).current = el
          if (typeof ref === 'function') ref(el)
          else if (ref) (ref as React.MutableRefObject<HTMLSelectElement | null>).current = el
        }}
        id={selectId}
        value={internalValue}
        onChange={e => {
          setInternalValue(e.target.value)
          onChange?.(e)
        }}
        disabled={disabled}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1, overflow: 'hidden' }}
        tabIndex={-1}
        aria-hidden="true"
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Visual trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 12px',
          fontSize: 13,
          borderRadius: 10,
          border: `1.5px solid ${error ? '#f87171' : open ? 'var(--accent)' : 'var(--border)'}`,
          background: disabled ? 'var(--surface-3)' : 'var(--surface)',
          color: isPlaceholder ? 'var(--text-muted)' : 'var(--text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(46,107,230,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'border-color 150ms, box-shadow 150ms',
          opacity: disabled ? 0.6 : 1,
          fontFamily: 'var(--font-body)',
          ...style,
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label || placeholder || 'Selecionar...'}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)',
            overflow: 'hidden',
            animation: 'selectFadeIn 130ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div style={{ maxHeight: 220, overflowY: 'auto', padding: '4px' }}>
            {allOptions.map(opt => {
              const isSelected = opt.value === internalValue
              const isPlaceholderOpt = opt.value === '' && !!placeholder
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    fontSize: 13,
                    borderRadius: 8,
                    border: 'none',
                    background: isSelected ? 'var(--accent-soft)' : 'transparent',
                    color: isPlaceholderOpt
                      ? 'var(--text-muted)'
                      : isSelected
                      ? 'var(--accent)'
                      : 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </span>
                  {isSelected && <Check size={13} style={{ flexShrink: 0, color: 'var(--accent)' }} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{error}</p>}

      <style>{`
        @keyframes selectFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
})

Select.displayName = 'Select'
