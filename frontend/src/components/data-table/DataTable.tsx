import { useRef, useMemo, useState, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

/**
 * Virtualised table for the CRM's long lists.
 *
 * Only the visible rows exist in the DOM, so 1,700 contacts cost roughly the
 * same as 30. Rows are a fixed height because a measured height would force a
 * second layout pass on every scroll frame, which is what makes virtualised
 * tables feel worse than the paginated ones they replace.
 */

export type DataTableProps<T> = {
  data: T[]
  columns: ColumnDef<T, any>[]
  /** Stable row identity. Falls back to the index, which breaks selection on reorder. */
  getRowId?: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  /** Prefetch on hover intent, so opening a record feels instant. */
  onRowHoverIntent?: (row: T) => void
  /** Called when the viewport nears the end. Wire this to fetchNextPage. */
  onEndReached?: () => void
  isLoading?: boolean
  emptyState?: React.ReactNode
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  rowHeight?: number
  /** Reserve space below the last row for a sticky footer or action bar. */
  footerOffset?: number
}

const HOVER_INTENT_MS = 150

export function DataTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  onRowHoverIntent,
  onEndReached,
  isLoading,
  emptyState,
  selectedIds,
  onSelectionChange,
  rowHeight,
  footerOffset = 0,
}: DataTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId as any,
  })

  const rows = table.getRowModel().rows

  const estimateSize = useCallback(
    () => rowHeight ?? parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--row-height') || '34',
      10,
    ),
    [rowHeight],
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: 10,
  })

  const virtualRows = virtualizer.getVirtualItems()

  // Fire onEndReached once the last virtual row is within a screen of the end.
  const lastVirtual = virtualRows[virtualRows.length - 1]
  const nearEnd = lastVirtual && lastVirtual.index >= rows.length - 15
  useMemo(() => {
    if (nearEnd && !isLoading) onEndReached?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearEnd, isLoading])

  const handleHover = (row: Row<T>) => {
    if (!onRowHoverIntent) return
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => onRowHoverIntent(row.original), HOVER_INTENT_MS)
  }
  const cancelHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }

  const toggleSelection = (id: string) => {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    onSelectionChange(next)
  }

  // j/k to move, Enter to open, x to select — the same keys as the rest of the app.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!rows.length) return
    const move = (delta: number) => {
      e.preventDefault()
      const next = Math.min(Math.max(focusedIndex + delta, 0), rows.length - 1)
      setFocusedIndex(next)
      virtualizer.scrollToIndex(next, { align: 'auto' })
    }
    if (e.key === 'j' || e.key === 'ArrowDown') move(1)
    else if (e.key === 'k' || e.key === 'ArrowUp') move(-1)
    else if (e.key === 'Enter') {
      e.preventDefault()
      onRowClick?.(rows[focusedIndex].original)
    } else if (e.key === 'x') {
      e.preventDefault()
      toggleSelection(rows[focusedIndex].id)
    }
  }

  if (!isLoading && rows.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      role="grid"
      aria-rowcount={rows.length}
      onKeyDown={onKeyDown}
      style={{
        overflow: 'auto',
        height: '100%',
        outline: 'none',
        background: 'var(--surface)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          tableLayout: 'fixed',
        }}
      >
        <thead
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            background: 'var(--surface)',
            boxShadow: 'inset 0 -1px 0 var(--border)',
          }}
        >
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {selectedIds && onSelectionChange && (
                <th style={{ width: 34, padding: '0 0 0 12px' }}>
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas as linhas visíveis"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < rows.length
                    }}
                    onChange={(e) =>
                      onSelectionChange(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())
                    }
                    style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer' }}
                  />
                </th>
              )}
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    width: header.getSize() === 150 ? undefined : header.getSize(),
                    textAlign: 'left',
                    padding: '0 12px',
                    height: 36,
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody style={{ position: 'relative' }}>
          {/* Spacer rows keep the scrollbar honest while only the window renders. */}
          {virtualRows.length > 0 && virtualRows[0].start > 0 && (
            <tr style={{ height: virtualRows[0].start }} aria-hidden />
          )}

          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index]
            const isSelected = selectedIds?.has(row.id)
            const isFocused = virtualRow.index === focusedIndex
            return (
              <tr
                key={row.id}
                role="row"
                aria-selected={isSelected}
                onClick={() => onRowClick?.(row.original)}
                onMouseEnter={() => handleHover(row)}
                onMouseLeave={cancelHover}
                style={{
                  height: virtualRow.size,
                  cursor: onRowClick ? 'pointer' : undefined,
                  background: isSelected
                    ? 'var(--accent-soft)'
                    : isFocused
                    ? 'var(--surface-3)'
                    : 'transparent',
                  boxShadow: isFocused ? 'inset 2px 0 0 var(--accent)' : undefined,
                  transition: `background var(--dur-hover) var(--ease-out)`,
                }}
                className="data-table-row"
              >
                {selectedIds && onSelectionChange && (
                  <td
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 34, padding: '0 0 0 12px', borderBottom: '1px solid var(--border)' }}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Selecionar linha ${virtualRow.index + 1}`}
                      checked={Boolean(isSelected)}
                      onChange={() => toggleSelection(row.id)}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer' }}
                    />
                  </td>
                )}
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      padding: '0 12px',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}

          {virtualRows.length > 0 && (
            <tr
              aria-hidden
              style={{
                height:
                  virtualizer.getTotalSize() -
                  (virtualRows[virtualRows.length - 1]?.end ?? 0) +
                  footerOffset,
              }}
            />
          )}
        </tbody>
      </table>

      {isLoading && (
        <div
          style={{
            padding: '12px 16px',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          A carregar…
        </div>
      )}
    </div>
  )
}
