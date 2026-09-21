import { useMemo, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Upload, Search, Phone, PhoneOff, Inbox } from 'lucide-react'
import { DataTable } from '../components/data-table/DataTable'
import { LeadImportModal } from '../components/leads/LeadImportModal'
import { getLeads, type Lead, type LeadState } from '../api/leads.api'

/**
 * The cold-call inbox.
 *
 * Leads sit here until someone qualifies them, which is the whole point of the
 * model: a call list poured into the pipeline is what left 2,882 deals stuck
 * in the first stage. The default views answer "who do I ring now" rather than
 * showing every row at once.
 */

const STATE_LABEL: Record<LeadState, string> = {
  NOVO: 'Novo',
  A_TRABALHAR: 'A trabalhar',
  QUALIFICADO: 'Qualificado',
  DESQUALIFICADO: 'Desqualificado',
  NURTURING: 'Nurturing',
}

const STATE_STYLE: Record<LeadState, { bg: string; color: string }> = {
  NOVO: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  A_TRABALHAR: { bg: 'rgba(166,90,5,0.10)', color: 'var(--warning)' },
  QUALIFICADO: { bg: 'rgba(18,128,64,0.10)', color: 'var(--success)' },
  DESQUALIFICADO: { bg: 'var(--surface-3)', color: 'var(--text-muted)' },
  NURTURING: { bg: 'var(--surface-3)', color: 'var(--text-secondary)' },
}

/** The views a BDR actually works from, in the order the day runs. */
const VIEWS = [
  { id: 'due', label: 'Para ligar hoje', params: { dueOnly: true } },
  { id: 'novo', label: 'Por contactar', params: { state: 'NOVO' } },
  { id: 'trabalhar', label: 'A trabalhar', params: { state: 'A_TRABALHAR' } },
  { id: 'qualificado', label: 'Qualificados', params: { state: 'QUALIFICADO' } },
  { id: 'nurturing', label: 'Nurturing', params: { state: 'NURTURING' } },
  { id: 'todos', label: 'Todos', params: {} },
] as const

const PAGE_SIZE = 50

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '—'

export function LeadsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>('due')
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)

  const params = useMemo(() => {
    const v = VIEWS.find((x) => x.id === view)!
    return { ...v.params, ...(search.trim() ? { search: search.trim() } : {}) }
  }, [view, search])

  const query = useInfiniteQuery({
    queryKey: ['leads', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await getLeads({ ...params, limit: PAGE_SIZE, cursor: pageParam })
      return res.data as { data: Lead[]; nextCursor: string | null }
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })

  const leads = query.data?.pages.flatMap((p) => p.data) ?? []

  const columns = useMemo<ColumnDef<Lead, any>[]>(
    () => [
      {
        id: 'company',
        header: 'Empresa',
        size: 210,
        cell: ({ row }) => (
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.original.companyName ?? row.original.contactName ?? '—'}
          </span>
        ),
      },
      {
        id: 'contact',
        header: 'Contacto',
        size: 150,
        cell: ({ row }) => (
          <span style={{ color: 'var(--text-secondary)' }}>
            {row.original.contactName ?? '—'}
          </span>
        ),
      },
      {
        id: 'phone',
        header: 'Telemóvel',
        size: 140,
        cell: ({ row }) => {
          const { phone, optOutCalls } = row.original
          if (!phone) return <span style={{ color: 'var(--text-muted)' }}>—</span>
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {optOutCalls ? (
                <PhoneOff size={12} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              ) : (
                <Phone size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
              <span
                style={{
                  color: optOutCalls ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: optOutCalls ? 'line-through' : undefined,
                }}
              >
                {phone}
              </span>
            </span>
          )
        },
      },
      {
        id: 'sector',
        header: 'Setor',
        size: 130,
        cell: ({ row }) => (
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {row.original.company?.sector?.replace(/_/g, ' ').toLowerCase() ?? '—'}
          </span>
        ),
      },
      {
        id: 'attempts',
        header: 'Tentativas',
        size: 90,
        cell: ({ row }) => (
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {row.original.attempts || '—'}
          </span>
        ),
      },
      {
        id: 'nextAttempt',
        header: 'Próxima ação',
        size: 110,
        cell: ({ row }) => {
          const next = row.original.nextAttemptAt
          const overdue = next && new Date(next) < new Date()
          return (
            <span
              style={{
                fontSize: 12,
                fontWeight: overdue ? 600 : 400,
                color: overdue ? 'var(--danger)' : 'var(--text-secondary)',
              }}
            >
              {formatDate(next)}
            </span>
          )
        },
      },
      {
        id: 'state',
        header: 'Estado',
        size: 120,
        cell: ({ row }) => {
          const s = STATE_STYLE[row.original.state]
          return (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 600,
                background: s.bg,
                color: s.color,
              }}
            >
              {STATE_LABEL[row.original.state]}
            </span>
          )
        },
      },
      {
        id: 'owner',
        header: 'Responsável',
        size: 130,
        cell: ({ row }) => (
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {row.original.owner?.name ?? '—'}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'var(--font-body)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}
        >
          Leads
        </h1>
        <button
          onClick={() => setShowImport(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            height: 34,
            padding: '0 13px',
            border: '1px solid var(--border-strong)',
            borderRadius: 7,
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
          }}
        >
          <Upload size={14} />
          Importar CSV
        </button>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <nav style={{ display: 'flex', gap: 2 }} aria-label="Vistas de leads">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-current={view === v.id}
              style={{
                height: 30,
                padding: '0 11px',
                border: 'none',
                borderRadius: 6,
                background: view === v.id ? 'var(--accent-soft)' : 'transparent',
                color: view === v.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: view === v.id ? 600 : 500,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          ))}
        </nav>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            height: 30,
            padding: '0 10px',
            marginLeft: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 7,
            background: 'var(--surface)',
          }}
        >
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar empresa, telefone…"
            aria-label="Procurar leads"
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              color: 'var(--text-primary)',
              width: 210,
            }}
          />
        </label>
      </div>

      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--card-radius)',
          background: 'var(--surface)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 'calc(100vh - 240px)', minHeight: 300 }}>
          <DataTable
            data={leads}
            columns={columns}
            getRowId={(l) => l.id}
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
            }}
            isLoading={query.isFetchingNextPage}
            emptyState={
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <span
                  style={{
                    display: 'inline-grid',
                    placeItems: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                  }}
                >
                  <Inbox size={20} />
                </span>
                <p style={{ margin: '11px 0 3px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {search ? 'Sem resultados' : 'Ainda não há leads'}
                </p>
                <p
                  style={{
                    margin: '0 auto 14px',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    maxWidth: 340,
                  }}
                >
                  {search
                    ? 'Nenhuma lead corresponde à pesquisa.'
                    : 'Importa a lista de clínicas para começar a ligar. O ficheiro é validado antes de gravar.'}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowImport(true)}
                    style={{
                      height: 32,
                      padding: '0 14px',
                      border: 'none',
                      borderRadius: 7,
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: 'var(--font-body)',
                      cursor: 'pointer',
                    }}
                  >
                    Importar CSV
                  </button>
                )}
              </div>
            }
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 14px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {leads.length === 0
              ? 'Sem leads'
              : `${leads.length} lead${leads.length === 1 ? '' : 's'}`}
          </span>
          {query.hasNextPage && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {query.isFetchingNextPage ? 'A carregar mais…' : 'Continua ao deslizar'}
            </span>
          )}
        </div>
      </div>

      {showImport && (
        <LeadImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            queryClient.invalidateQueries({ queryKey: ['leads'] })
          }}
        />
      )}
    </div>
  )
}

export default LeadsPage
