import React, { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface ColumnDef<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  width?: string | number
  sortable?: boolean
}

interface DataTableProps<T extends { id: string | number }> {
  columns: ColumnDef<T>[]
  data: T[]
  selectable?: boolean
  onSelectionChange?: (selected: (string | number)[]) => void
  onRowClick?: (row: T) => void
  footer?: React.ReactNode
  emptyMessage?: string
  maxHeight?: string | number
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  selectable = false,
  onSelectionChange,
  onRowClick,
  footer,
  emptyMessage = 'Sem dados',
  maxHeight,
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [hoveredRow, setHoveredRow] = useState<string | number | null>(null)

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set())
      onSelectionChange?.([])
    } else {
      const all = data.map(r => r.id)
      setSelected(new Set(all))
      onSelectionChange?.(all)
    }
  }

  const toggleRow = (id: string | number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    onSelectionChange?.(Array.from(next))
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const allSelected = data.length > 0 && selected.size === data.length
  const someSelected = selected.size > 0 && selected.size < data.length

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ overflowX: 'auto', overflowY: maxHeight ? 'auto' : 'visible', maxHeight }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {selectable && (
                <th style={{ width: 44, padding: '10px 14px' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }}
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  style={{
                    width: col.width,
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.header}
                    {col.sortable && (
                      <span style={{ display: 'inline-flex', flexDirection: 'column', opacity: sortKey === String(col.key) ? 1 : 0.35 }}>
                        <ChevronUp size={10} style={{ marginBottom: -2, color: sortKey === String(col.key) && sortDir === 'asc' ? 'var(--accent)' : undefined }} />
                        <ChevronDown size={10} style={{ color: sortKey === String(col.key) && sortDir === 'desc' ? 'var(--accent)' : undefined }} />
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  style={{ padding: '40px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const isSelected = selected.has(row.id)
                const isHovered = hoveredRow === row.id
                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      borderBottom: idx < data.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isSelected
                        ? 'var(--accent-soft)'
                        : isHovered
                          ? 'var(--surface-3)'
                          : 'var(--surface)',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background 120ms',
                    }}
                  >
                    {selectable && (
                      <td style={{ padding: '12px 14px' }} onClick={e => { e.stopPropagation(); toggleRow(row.id) }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={String(col.key)}
                        style={{
                          padding: '12px 14px',
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          verticalAlign: 'middle',
                        }}
                      >
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>

          {footer && (
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: '10px 14px' }}>
                  {footer}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {selectable && selected.size > 0 && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--accent-soft)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
            {selected.size} selecionado{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => { setSelected(new Set()); onSelectionChange?.([]) }}
            style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  )
}
