import React, { useState } from 'react'

/* ── Design tokens ────────────────────────────────────────────── */
const T = {
  navy:    '#0f2553',
  gold:    '#b8963e',
  white:   '#ffffff',
  offWhite:'#f8f9fc',
  border:  '#dce3ef',
  muted:   '#6b7a99',
}

export interface ColumnDef<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  width?: string | number
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

  const allSelected = data.length > 0 && selected.size === data.length
  const someSelected = selected.size > 0 && selected.size < data.length

  return (
    <div style={{
      background: T.white,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(15,37,83,0.04)',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ overflowX: 'auto', overflowY: maxHeight ? 'auto' : 'visible', maxHeight }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          {/* Sticky header */}
          <thead>
            <tr style={{ background: T.offWhite, borderBottom: `1px solid ${T.border}` }}>
              {selectable && (
                <th style={{ width: 44, padding: '10px 14px' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: T.navy }}
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
                    color: T.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  style={{ padding: '32px 14px', textAlign: 'center', color: T.muted, fontSize: 13 }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const isSelected = selected.has(row.id)
                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderBottom: idx < data.length - 1 ? `1px solid ${T.border}` : 'none',
                      background: isSelected ? 'rgba(15,37,83,0.04)' : T.white,
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = T.offWhite
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? 'rgba(15,37,83,0.04)' : T.white
                    }}
                  >
                    {selectable && (
                      <td style={{ padding: '12px 14px' }} onClick={e => { e.stopPropagation(); toggleRow(row.id) }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: T.navy }}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={String(col.key)}
                        style={{ padding: '12px 14px', fontSize: 13, color: T.navy, verticalAlign: 'middle' }}
                      >
                        {col.render
                          ? col.render(row)
                          : String((row as any)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>

          {footer && (
            <tfoot>
              <tr style={{ borderTop: `1px solid ${T.border}`, background: T.offWhite }}>
                <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: '10px 14px' }}>
                  {footer}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Selection bar */}
      {selectable && selected.size > 0 && (
        <div style={{
          borderTop: `1px solid ${T.border}`,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(15,37,83,0.04)',
        }}>
          <span style={{ fontSize: 13, color: T.navy, fontWeight: 600 }}>
            {selected.size} selecionado{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => { setSelected(new Set()); onSelectionChange?.([]) }}
            style={{ fontSize: 12, color: T.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  )
}
