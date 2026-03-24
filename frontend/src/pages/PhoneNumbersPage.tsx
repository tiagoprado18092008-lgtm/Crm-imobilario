import React, { useEffect, useState } from 'react'
import { Phone, Plus, Search, Trash2, Edit2, Check, X, Globe } from 'lucide-react'
import { listNumbers, searchNumbers, purchaseNumber, releaseNumber, updateNumber } from '../api/phone-numbers.api'

const COUNTRIES = [
  { code: 'US', name: 'Estados Unidos' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'PT', name: 'Portugal' },
  { code: 'BR', name: 'Brasil' },
  { code: 'ES', name: 'Espanha' },
  { code: 'FR', name: 'França' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'CA', name: 'Canadá' },
  { code: 'AU', name: 'Austrália' },
]

export const PhoneNumbersPage: React.FC = () => {
  const [numbers, setNumbers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [country, setCountry] = useState('US')
  const [areaCode, setAreaCode] = useState('')
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const res = await listNumbers()
      setNumbers(res.data)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSearch = async () => {
    setSearchLoading(true)
    setError('')
    try {
      const res = await searchNumbers(country, areaCode || undefined)
      setResults(res.data)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao pesquisar números')
    } finally { setSearchLoading(false) }
  }

  const handlePurchase = async (num: any) => {
    setPurchasing(num.phoneNumber)
    try {
      await purchaseNumber(num.phoneNumber, num.friendlyName || num.phoneNumber)
      await load()
      setShowSearch(false)
      setResults([])
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao comprar número')
    } finally { setPurchasing(null) }
  }

  const handleRelease = async (id: string) => {
    if (!confirm('Tens a certeza que queres libertar este número? Esta ação não pode ser desfeita.')) return
    try {
      await releaseNumber(id)
      setNumbers(n => n.filter(x => x.id !== id))
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao libertar número')
    }
  }

  const handleEdit = async (id: string) => {
    try {
      await updateNumber(id, editName)
      setNumbers(n => n.map(x => x.id === id ? { ...x, friendlyName: editName } : x))
      setEditId(null)
    } catch { }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Números de Telefone</h1>
          <p className="text-slate-500 text-sm mt-1">Compra e gere números para SMS e chamadas</p>
        </div>
        <button onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <Plus size={16} /> Comprar número
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Números ativos', value: numbers.length, icon: Phone, color: '#6366f1' },
          { label: 'Custo mensal', value: `$${(numbers.length * 1.15).toFixed(2)}`, icon: Globe, color: '#10b981' },
          { label: 'SMS disponíveis', value: numbers.filter(n => JSON.parse(n.capabilities || '{}').sms).length, icon: Search, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.color + '15' }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Numbers list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">A carregar...</div>
        ) : numbers.length === 0 ? (
          <div className="p-12 text-center">
            <Phone size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Sem números comprados</p>
            <p className="text-slate-400 text-sm mt-1">Compra um número para receber SMS e chamadas</p>
            <button onClick={() => setShowSearch(true)}
              className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              Comprar primeiro número
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Número', 'Nome', 'País', 'Capacidades', 'Custo/mês', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numbers.map(n => (
                <tr key={n.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-slate-800">{n.number}</span>
                  </td>
                  <td className="px-4 py-3">
                    {editId === n.id ? (
                      <div className="flex items-center gap-1">
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-32" />
                        <button onClick={() => handleEdit(n.id)} className="text-green-500"><Check size={14} /></button>
                        <button onClick={() => setEditId(null)} className="text-slate-400"><X size={14} /></button>
                      </div>
                    ) : (
                      <span className="text-slate-600">{n.friendlyName || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{n.countryCode}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {JSON.parse(n.capabilities || '{}').voice && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Voz</span>
                      )}
                      {JSON.parse(n.capabilities || '{}').sms && (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">SMS</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-sm">${n.monthlyPrice?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditId(n.id); setEditName(n.friendlyName || '') }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Edit2 size={14} /></button>
                      <button onClick={() => handleRelease(n.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Pesquisar números disponíveis</h2>
              <button onClick={() => { setShowSearch(false); setResults([]); setError('') }}
                className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl p-3">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">País</label>
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Indicativo (opcional)</label>
                  <input value={areaCode} onChange={e => setAreaCode(e.target.value)}
                    placeholder="ex: 415"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
              </div>
              <button onClick={handleSearch} disabled={searchLoading}
                className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {searchLoading ? 'A pesquisar...' : 'Pesquisar números'}
              </button>

              {results.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-slate-500 font-medium">{results.length} números disponíveis</p>
                  {results.map(r => (
                    <div key={r.phoneNumber} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:border-indigo-200">
                      <div>
                        <p className="font-mono font-semibold text-slate-800">{r.phoneNumber}</p>
                        <p className="text-xs text-slate-400">{r.locality || r.region || r.isoCountry} · ${r.monthlyPrice}/mês</p>
                      </div>
                      <button onClick={() => handlePurchase(r)} disabled={purchasing === r.phoneNumber}
                        className="px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        {purchasing === r.phoneNumber ? '...' : 'Comprar'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!error && results.length === 0 && !searchLoading && (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-400">Seleciona um país e clica em pesquisar</p>
                  <p className="text-xs text-slate-300 mt-1">Precisas de configurar o Twilio em Definições → Telefone</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
