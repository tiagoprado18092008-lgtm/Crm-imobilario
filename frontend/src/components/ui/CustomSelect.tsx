import React, { useState, useRef, useEffect, useCallback, useId } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
  description?: string
  color?: string
  disabled?: boolean
}

interface CustomSelectProps {
  value?: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  error?: string
  required?: boolean
  searchable?: boolean
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecionar...',
  label,
  error,
  required,
  searchable = false,
  disabled = false,
  className = '',
  size = 'md',
}) => {
  const uid = useId()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const handleSelect = useCallback((opt: SelectOption) => {
    if (opt.disabled) return
    onChange(opt.value)
    setOpen(false)
    setSearch('')
  }, [onChange])

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open, searchable])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const py = size === 'sm' ? '6px' : '9px'
  const px = size === 'sm' ? '10px' : '12px'
  const fs = size === 'sm' ? 12 : 13
  const br = size === 'sm' ? 9 : 10

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label
          htmlFor={uid}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}
        >
          {label}
          {required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        id={uid}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: `${py} ${px}`,
          fontSize: fs,
          borderRadius: br,
          border: `1.5px solid ${error ? '#f87171' : open ? 'var(--accent)' : 'var(--border)'}`,
          background: disabled ? 'var(--surface-3)' : 'var(--surface)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(46,107,230,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'border-color 150ms, box-shadow 150ms',
          opacity: disabled ? 0.6 : 1,
          fontFamily: 'var(--font-body)',
        }}
      >
        {selected?.icon && (
          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{selected.icon}</span>
        )}
        {selected?.color && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: selected.color, flexShrink: 0 }} />
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
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
          {searchable && (
            <div style={{ padding: '8px 8px 4px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1.5px solid var(--border)',
              }}>
                <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar..."
                  style={{
                    border: 'none', background: 'none', outline: 'none',
                    fontSize: 12, color: 'var(--text-primary)', width: '100%',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ maxHeight: 228, overflowY: 'auto', padding: '4px' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Sem resultados
              </div>
            )}
            {filtered.map(opt => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    fontSize: fs,
                    borderRadius: 8,
                    border: 'none',
                    background: isSelected ? 'var(--accent-soft)' : 'transparent',
                    color: opt.disabled
                      ? 'var(--text-muted)'
                      : isSelected
                      ? 'var(--accent)'
                      : 'var(--text-primary)',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'background 100ms',
                    opacity: opt.disabled ? 0.5 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!isSelected && !opt.disabled)
                      (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.background = isSelected ? 'var(--accent-soft)' : 'transparent'
                  }}
                >
                  {opt.icon && (
                    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{opt.icon}</span>
                  )}
                  {opt.color && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </div>
                    {opt.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {opt.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={13} style={{ flexShrink: 0, color: 'var(--accent)' }} />
                  )}
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
}
