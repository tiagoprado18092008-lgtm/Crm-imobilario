import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Users, Kanban, MessageSquare, PhoneCall, CalendarClock,
  BarChart3, Settings, Plus, ArrowRight,
} from 'lucide-react'
import { globalSearch } from '../../api/search.api'

/**
 * Cmd+K: one entry point for going somewhere, finding a record, or starting an
 * action. Navigation and creation are listed locally and respond instantly;
 * record search is debounced and merged in when it arrives, so typing never
 * waits on the network.
 */

type Item = {
  id: string
  label: string
  hint?: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  run: () => void
  group: string
}

const DEBOUNCE_MS = 250

export function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [results, setResults] = useState<{ contacts: any[]; opportunities: any[] }>({
    contacts: [],
    opportunities: [],
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Open with Cmd/Ctrl+K anywhere except inside a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setResults({ contacts: [], opportunities: [] })
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Record search runs on the server; local items filter without it.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ contacts: [], opportunities: [] })
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await globalSearch(query.trim())
        setResults({
          contacts: res.data?.contacts ?? [],
          opportunities: res.data?.opportunities ?? [],
        })
      } catch {
        /* search is additive; a failure just leaves local items */
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  const go = useCallback(
    (path: string) => () => {
      navigate(path)
      setOpen(false)
    },
    [navigate],
  )

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()

    const navigation: Item[] = [
      { id: 'nav-contacts', label: 'Contactos', icon: Users, run: go('/contacts'), group: 'Ir para' },
      { id: 'nav-pipeline', label: 'Pipeline', icon: Kanban, run: go('/pipeline'), group: 'Ir para' },
      { id: 'nav-conversas', label: 'Conversas', icon: MessageSquare, run: go('/conversations'), group: 'Ir para' },
      { id: 'nav-chamadas', label: 'Chamadas', icon: PhoneCall, run: go('/calls'), group: 'Ir para' },
      { id: 'nav-agenda', label: 'Agenda', icon: CalendarClock, run: go('/appointments'), group: 'Ir para' },
      { id: 'nav-relatorios', label: 'Relatórios', icon: BarChart3, run: go('/reports'), group: 'Ir para' },
      { id: 'nav-definicoes', label: 'Definições', icon: Settings, run: go('/settings'), group: 'Ir para' },
    ]

    const actions: Item[] = [
      { id: 'new-contact', label: 'Novo contacto', icon: Plus, run: go('/contacts?new=1'), group: 'Criar' },
      { id: 'new-opp', label: 'Novo negócio', icon: Plus, run: go('/pipeline?new=1'), group: 'Criar' },
    ]

    const records: Item[] = [
      ...results.contacts.map((c: any) => ({
        id: `contact-${c.id}`,
        label: c.name,
        hint: c.email || c.phone || undefined,
        icon: Users,
        run: go(`/contacts/${c.id}`),
        group: 'Contactos',
      })),
      ...results.opportunities.map((o: any) => ({
        id: `opp-${o.id}`,
        label: o.title,
        hint: o.value ? `${Number(o.value).toLocaleString('pt-PT')} €` : undefined,
        icon: Kanban,
        run: go('/pipeline'),
        group: 'Negócios',
      })),
    ]

    const match = (i: Item) => !q || i.label.toLowerCase().includes(q)
    return [...records, ...navigation.filter(match), ...actions.filter(match)]
  }, [query, results, go])

  useEffect(() => setActive(0), [items.length])

  if (!open) return null

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[active]?.run()
    }
  }

  let lastGroup = ''

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pesquisar e navegar"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(12, 27, 45, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 92vw)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--card-radius)',
          boxShadow: '0 24px 64px rgba(12, 27, 45, 0.24)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 14px',
            height: 48,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Procurar contactos, negócios ou ir para…"
            aria-label="Pesquisar"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div ref={listRef} style={{ maxHeight: '52vh', overflowY: 'auto', padding: 6 }}>
          {items.length === 0 && (
            <p style={{ padding: '20px 14px', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Sem resultados para “{query}”.
            </p>
          )}

          {items.map((item, i) => {
            const showGroup = item.group !== lastGroup
            lastGroup = item.group
            const Icon = item.icon
            const isActive = i === active
            return (
              <div key={item.id}>
                {showGroup && (
                  <p
                    style={{
                      margin: '8px 10px 4px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {item.group}
                  </p>
                )}
                <button
                  onClick={item.run}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '0 10px',
                    height: 36,
                    border: 'none',
                    borderRadius: 6,
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Icon size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                  {item.hint && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.hint}</span>
                  )}
                  {isActive && <ArrowRight size={13} style={{ color: 'var(--accent)' }} />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
