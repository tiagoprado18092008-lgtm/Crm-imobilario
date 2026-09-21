import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

/**
 * The proposal as the client sees it.
 *
 * Written for someone outside the company with no account and no context: it
 * answers what is being offered, what it costs, and what happens next, then
 * gets out of the way. No navigation, no product marketing, nothing to click
 * except the decision.
 */

type PublicQuote = {
  number: number
  version: number
  state: string
  validUntil: string | null
  notes: string | null
  expired: boolean
  agency: { name: string; logoUrl: string | null } | null
  deal: {
    title: string
    contact: { name: string; email: string | null } | null
    company: { name: string; nif: string | null; address: string | null } | null
    lineItems: Array<{
      id: string
      name: string
      quantity: number
      unitPrice: number
      discount: number
      vatRate: number
      revenueType: string
    }>
  }
  totals: {
    subtotal: number
    discountTotal: number
    vatTotal: number
    total: number
    mrr: number
    oneOff: number
  }
}

const euro = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })

export default function PublicQuotePage() {
  const { token } = useParams<{ token: string }>()
  const [quote, setQuote] = useState<PublicQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answering, setAnswering] = useState(false)
  const [answered, setAnswered] = useState<'ACEITE' | 'RECUSADA' | null>(null)

  useEffect(() => {
    axios
      .get(`/p/proposta/${token}`)
      .then((r) => {
        setQuote(r.data)
        if (r.data.state === 'ACEITE') setAnswered('ACEITE')
        if (r.data.state === 'RECUSADA') setAnswered('RECUSADA')
      })
      .catch((err) =>
        setError(
          err?.response?.status === 404
            ? 'Esta proposta não existe ou já não está disponível.'
            : 'Não foi possível carregar a proposta.',
        ),
      )
      .finally(() => setLoading(false))
  }, [token])

  const respond = async (accept: boolean) => {
    setAnswering(true)
    try {
      await axios.post(`/p/proposta/${token}/${accept ? 'accept' : 'reject'}`)
      setAnswered(accept ? 'ACEITE' : 'RECUSADA')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Não foi possível registar a resposta.')
    } finally {
      setAnswering(false)
    }
  }

  if (loading) {
    return <Shell><p style={muted}>A carregar…</p></Shell>
  }

  if (error || !quote) {
    return (
      <Shell>
        <h1 style={h1}>Proposta indisponível</h1>
        <p style={muted}>{error}</p>
      </Shell>
    )
  }

  const { deal, totals } = quote
  const canRespond = !answered && !quote.expired

  return (
    <Shell>
      <header style={{ marginBottom: 30 }}>
        <p style={{ ...muted, margin: 0 }}>
          {quote.agency?.name ?? 'AlphaScale AI'}
        </p>
        <h1 style={{ ...h1, marginTop: 4 }}>{deal.title}</h1>
        <p style={{ ...muted, marginTop: 6 }}>
          Proposta {quote.number}
          {quote.version > 1 ? `, versão ${quote.version}` : ''}
          {deal.company ? ` · ${deal.company.name}` : ''}
        </p>
      </header>

      {quote.expired && !answered && (
        <Banner tone="warning">
          Esta proposta expirou a {quote.validUntil ? longDate(quote.validUntil) : '—'}.
          Fala connosco para receber uma nova.
        </Banner>
      )}

      {answered === 'ACEITE' && (
        <Banner tone="success">
          Proposta aceite. Entramos em contacto para arrancar com o trabalho.
        </Banner>
      )}

      {answered === 'RECUSADA' && (
        <Banner tone="muted">
          Resposta registada. Obrigado pelo tempo que dedicaste a analisá-la.
        </Banner>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22 }}>
        <thead>
          <tr>
            <Th>Serviço</Th>
            <Th align="right">Qtd.</Th>
            <Th align="right">Preço</Th>
            <Th align="right">Total</Th>
          </tr>
        </thead>
        <tbody>
          {deal.lineItems.map((item) => {
            const gross = item.quantity * item.unitPrice
            const net = gross - gross * (item.discount / 100)
            return (
              <tr key={item.id}>
                <Td>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  {item.revenueType === 'RECORRENTE' && (
                    <span style={{ ...muted, marginLeft: 7, fontSize: 13 }}>por mês</span>
                  )}
                  {item.discount > 0 && (
                    <span style={{ display: 'block', fontSize: 13, color: '#128040' }}>
                      Desconto de {item.discount}%
                    </span>
                  )}
                </Td>
                <Td align="right">{item.quantity}</Td>
                <Td align="right">{euro(item.unitPrice)}</Td>
                <Td align="right">{euro(net)}</Td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div style={{ marginLeft: 'auto', maxWidth: 320, marginBottom: 26 }}>
        {/* One-off and monthly are shown apart: they are two different
            commitments, and one total hiding both helps nobody decide. */}
        {totals.oneOff > 0 && <Row label="Valor único" value={euro(totals.oneOff)} />}
        {totals.mrr > 0 && <Row label="Mensalidade" value={`${euro(totals.mrr)} / mês`} />}
        {totals.discountTotal > 0 && (
          <Row label="Desconto" value={`− ${euro(totals.discountTotal)}`} />
        )}
        <Row label="IVA (23%)" value={euro(totals.vatTotal)} />
        <Row label="Total com IVA" value={euro(totals.total)} strong />
      </div>

      {quote.notes && (
        <section style={{ marginBottom: 26 }}>
          <h2 style={h2}>Notas</h2>
          <p style={{ ...body, whiteSpace: 'pre-wrap' }}>{quote.notes}</p>
        </section>
      )}

      {canRespond && (
        <section>
          <h2 style={h2}>Resposta</h2>
          <p style={{ ...muted, marginBottom: 14 }}>
            {quote.validUntil
              ? `Esta proposta é válida até ${longDate(quote.validUntil)}.`
              : 'Podes responder quando quiseres.'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => respond(true)} disabled={answering} style={primaryBtn}>
              {answering ? 'A registar…' : 'Aceitar proposta'}
            </button>
            <button onClick={() => respond(false)} disabled={answering} style={secondaryBtn}>
              Recusar
            </button>
          </div>
        </section>
      )}

      <footer style={{ marginTop: 44, paddingTop: 18, borderTop: '1px solid #DEE7F0' }}>
        <p style={{ ...muted, fontSize: 13, margin: 0 }}>
          {quote.agency?.name ?? 'AlphaScale AI'}
          {deal.company?.nif ? ` · NIF do cliente ${deal.company.nif}` : ''}
        </p>
      </footer>
    </Shell>
  )
}

/* The public page carries its own styles rather than the app's tokens: it is
   rendered for someone who has never seen the product, and it must look the
   same whether or not the app's stylesheet loaded. */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F4F8FC',
        padding: '44px 20px',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#0C1B2D',
      }}
    >
      <main
        style={{
          maxWidth: 680,
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #DEE7F0',
          borderRadius: 12,
          padding: '34px 36px',
        }}
      >
        {children}
      </main>
    </div>
  )
}

const h1: React.CSSProperties = {
  fontSize: 25,
  fontWeight: 700,
  margin: 0,
  letterSpacing: '-0.01em',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
}
const h2: React.CSSProperties = { fontSize: 15, fontWeight: 700, margin: '0 0 8px' }
const body: React.CSSProperties = { fontSize: 15, lineHeight: 1.6, margin: 0 }
const muted: React.CSSProperties = { fontSize: 14, color: '#46596F', margin: 0 }

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      style={{
        textAlign: align ?? 'left',
        padding: '0 0 8px',
        fontSize: 13,
        fontWeight: 600,
        color: '#46596F',
        borderBottom: '1px solid #DEE7F0',
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <td
      style={{
        textAlign: align ?? 'left',
        padding: '11px 0',
        fontSize: 15,
        borderBottom: '1px solid #EEF3F8',
        verticalAlign: 'top',
      }}
    >
      {children}
    </td>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '7px 0',
        borderTop: strong ? '1px solid #DEE7F0' : undefined,
        marginTop: strong ? 6 : undefined,
      }}
    >
      <span style={{ fontSize: strong ? 15 : 14, color: strong ? '#0C1B2D' : '#46596F' }}>
        {label}
      </span>
      <span style={{ fontSize: strong ? 17 : 15, fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  )
}

function Banner({ tone, children }: { tone: 'success' | 'warning' | 'muted'; children: React.ReactNode }) {
  const palette = {
    success: { bg: 'rgba(18,128,64,0.08)', fg: '#0E6B33' },
    warning: { bg: 'rgba(166,90,5,0.08)', fg: '#8F4D04' },
    muted: { bg: '#F4F8FC', fg: '#46596F' },
  }[tone]

  return (
    <p
      style={{
        margin: '0 0 22px',
        padding: '12px 14px',
        borderRadius: 9,
        background: palette.bg,
        color: palette.fg,
        fontSize: 14.5,
        lineHeight: 1.5,
      }}
    >
      {children}
    </p>
  )
}

const primaryBtn: React.CSSProperties = {
  height: 42,
  padding: '0 22px',
  border: 'none',
  borderRadius: 8,
  background: '#143253',
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  height: 42,
  padding: '0 22px',
  border: '1px solid #BFCEDE',
  borderRadius: 8,
  background: '#fff',
  color: '#0C1B2D',
  fontSize: 15,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
}
