import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Building2, TrendingUp } from 'lucide-react'
import { globalSearch } from '../../api/search.api'

interface SearchResult {
  contacts: any[]
  properties: any[]
  opportunities: any[]
}

export const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ contacts: [], properties: [], opportunities: [] })
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Build flat list of all results for keyboard navigation
  const allItems: { type: string; id: string; label: string; sub: string; path: string }[] = []
  results.contacts.forEach(c => allItems.push({ type: 'contact', id: c.id, label: c.name, sub: c.email || c.phone || c.type, path: `/contacts/${c.id}` }))
  results.properties.forEach(p => allItems.push({ type: 'property', id: p.id, label: p.title, sub: p.city || p.type, path: `/properties/${p.id}` }))
  results.opportunities.forEach(o => allItems.push({ type: 'opportunity', id: o.id, label: o.title, sub: o.stage, path: `/opportunities/${o.id}` }))

  // Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults({ contacts: [], properties: [], opportunities: [] })
      setSelectedIndex(0)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ contacts: [], properties: [], opportunities: [] })
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearch(query)
        setResults(res.data)
        setSelectedIndex(0)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const goTo = useCallback((path: string) => {
    setOpen(false)
    navigate(path)
  }, [navigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, allItems.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter' && allItems[selectedIndex]) { e.preventDefault(); goTo(allItems[selectedIndex].path); return }
  }

  if (!open) return null

  const hasResults = allItems.length > 0
  const iconFor = (type: string) => {
    if (type === 'contact') return <Users style={{ width: 16, height: 16, color: '#3b82f6' }} />
    if (type === 'property') return <Building2 style={{ width: 16, height: 16, color: '#8b5cf6' }} />
    return <TrendingUp style={{ width: 16, height: 16, color: '#22c55e' }} />
  }
  const labelFor = (type: string) => {
    if (type === 'contact') return 'Contactos'
    if (type === 'property') return 'Propriedades'
    return 'Oportunidades'
  }

  let flatIndex = -1

  const renderSection = (type: string, items: any[]) => {
    if (items.length === 0) return null
    return (
      <div key={type}>
        <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {labelFor(type)}
        </div>
        {items.map(item => {
          flatIndex++
          const idx = flatIndex
          const isSelected = idx === selectedIndex
          return (
            <div
              key={item.id}
              onClick={() => goTo(type === 'contact' ? `/contacts/${item.id}` : type === 'property' ? `/properties/${item.id}` : `/opportunities/${item.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer',
                background: isSelected ? '#f1f5f9' : 'transparent', transition: 'background 100ms',
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {iconFor(type)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {type === 'contact' ? item.name : item.title}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {type === 'contact' ? (item.email || item.phone || item.type) : type === 'property' ? (item.address || item.type) : item.stage}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) setOpen(false) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560, background: '#fff', borderRadius: 16,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <Search style={{ width: 18, height: 18, color: '#94a3b8', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pesquisar contactos, propriedades, oportunidades..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#1e293b',
              background: 'transparent', fontFamily: 'inherit',
            }}
          />
          {loading && (
            <div style={{
              width: 18, height: 18, border: '2px solid #e2e8f0', borderTopColor: '#3b82f6',
              borderRadius: '50%', animation: 'spin 0.6s linear infinite', flexShrink: 0,
            }} />
          )}
          <button onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', padding: 4, border: 'none', background: '#f1f5f9', borderRadius: 6, cursor: 'pointer', color: '#64748b', fontSize: 11, gap: 2 }}>
            <span>Esc</span>
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {!query || query.length < 2 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              Escreva para pesquisar contactos, propriedades e oportunidades
            </div>
          ) : !loading && !hasResults ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              Nenhum resultado para "{query}"
            </div>
          ) : (
            <div style={{ paddingBottom: 8, paddingTop: 4 }}>
              {renderSection('contact', results.contacts)}
              {renderSection('property', results.properties)}
              {renderSection('opportunity', results.opportunities)}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
