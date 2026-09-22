import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban, AlertTriangle } from 'lucide-react'
import api from '../api/client'

/**
 * Delivery board.
 *
 * Grouped by state rather than listed, because the question this screen
 * answers is "what is stuck" — a list sorted by date buries a project that has
 * sat in onboarding for three weeks among ones that are merely due later.
 */

type Project = {
  id: string
  name: string
  type: string
  state: ProjectState
  startDate: string | null
  dueDate: string | null
  deliveredAt: string | null
  tasksDone: number
  tasksTotal: number
  company: { id: string; name: string; sector: string } | null
  owner: { id: string; name: string } | null
}

type ProjectState =
  | 'ONBOARDING' | 'EM_CURSO' | 'EM_REVISAO' | 'ENTREGUE' | 'EM_PAUSA' | 'TERMINADO'

const COLUMNS: Array<{ state: ProjectState; label: string }> = [
  { state: 'ONBOARDING', label: 'Onboarding' },
  { state: 'EM_CURSO', label: 'Em curso' },
  { state: 'EM_REVISAO', label: 'Em revisão' },
  { state: 'ENTREGUE', label: 'Entregue' },
]

const TYPE_LABEL: Record<string, string> = {
  WEBSITE: 'Website',
  ADS: 'Ads',
  REDES_SOCIAIS: 'Redes sociais',
  SEO: 'SEO',
  OUTRO: 'Outro',
}

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '—'

export function ProjetosPage() {
  const [selected, setSelected] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data as Project[]),
  })

  const projects = data ?? []

  const grouped = useMemo(() => {
    const map = new Map<ProjectState, Project[]>()
    for (const col of COLUMNS) map.set(col.state, [])
    for (const p of projects) {
      if (map.has(p.state)) map.get(p.state)!.push(p)
    }
    return map
  }, [projects])

  const overdue = projects.filter(
    (p) => p.dueDate && new Date(p.dueDate) < new Date() && !p.deliveredAt,
  ).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'var(--font-body)' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}
        >
          Projetos
        </h1>
        {overdue > 0 && (
          <span style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 600 }}>
            {overdue} com prazo ultrapassado
          </span>
        )}
      </header>

      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>A carregar…</p>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0, 1fr))`,
            gap: 12,
            alignItems: 'start',
          }}
        >
          {COLUMNS.map((col) => {
            const items = grouped.get(col.state) ?? []
            return (
              <section
                key={col.state}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--card-radius)',
                  background: 'var(--surface-2)',
                  minWidth: 0,
                }}
              >
                <header
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 12px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {col.label}
                  </h2>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length}</span>
                </header>

                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.length === 0 ? (
                    <p style={{ margin: 0, padding: '10px 4px', fontSize: 12, color: 'var(--text-muted)' }}>
                      Nada aqui.
                    </p>
                  ) : (
                    items.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        selected={selected === p.id}
                        onSelect={() => setSelected(selected === p.id ? null : p.id)}
                      />
                    ))
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project,
  selected,
  onSelect,
}: {
  project: Project
  selected: boolean
  onSelect: () => void
}) {
  const isOverdue =
    project.dueDate && new Date(project.dueDate) < new Date() && !project.deliveredAt
  const progress = project.tasksTotal > 0 ? project.tasksDone / project.tasksTotal : 0

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        display: 'block',
        width: '100%',
        padding: '10px 11px',
        border: '1px solid var(--border)',
        borderLeft: isOverdue ? '3px solid var(--warning)' : '1px solid var(--border)',
        borderRadius: 8,
        background: selected ? 'var(--accent-soft)' : 'var(--surface)',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {project.company?.name ?? project.name}
      </span>

      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
        {TYPE_LABEL[project.type] ?? project.type}
        {project.owner ? ` · ${project.owner.name}` : ''}
      </span>

      {/* Progress is the checklist, which is the honest measure of how far
          along a delivery is — not how long ago it started. */}
      {project.tasksTotal > 0 && (
        <span style={{ display: 'block', marginTop: 8 }}>
          <span
            aria-hidden
            style={{
              display: 'block',
              height: 4,
              borderRadius: 2,
              background: 'var(--surface-3)',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'block',
                width: `${Math.round(progress * 100)}%`,
                height: '100%',
                background: progress === 1 ? 'var(--success)' : 'var(--accent)',
              }}
            />
          </span>
          <span
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 5,
              fontSize: 11,
              color: isOverdue ? 'var(--warning)' : 'var(--text-muted)',
            }}
          >
            <span>
              {project.tasksDone}/{project.tasksTotal} tarefas
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {isOverdue && <AlertTriangle size={10} />}
              {shortDate(project.dueDate)}
            </span>
          </span>
        </span>
      )}
    </button>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '44px 16px',
        textAlign: 'center',
        border: '1px solid var(--border)',
        borderRadius: 'var(--card-radius)',
        background: 'var(--surface)',
      }}
    >
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
        <FolderKanban size={20} />
      </span>
      <p style={{ margin: '11px 0 3px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
        Ainda não há projetos
      </p>
      <p
        style={{
          margin: '0 auto',
          fontSize: 13,
          color: 'var(--text-secondary)',
          maxWidth: 380,
          lineHeight: 1.5,
        }}
      >
        Quando um negócio é ganho, o projeto abre sozinho com a checklist do
        serviço vendido — website, ads, redes sociais ou SEO.
      </p>
    </div>
  )
}

export default ProjetosPage
