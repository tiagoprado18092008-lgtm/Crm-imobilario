import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  inline?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.inline) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#fef2f2' }}>
            <AlertTriangle size={22} style={{ color: '#ef4444' }} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Algo correu mal</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: '#6366f1', border: 'none', cursor: 'pointer' }}
          >
            <RefreshCw size={13} />
            Tentar novamente
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#f0f2f8' }}>
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center"
          style={{ border: '1px solid #eaecf3', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: '#fef2f2' }}>
            <AlertTriangle size={28} style={{ color: '#ef4444' }} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Ocorreu um erro</h2>
          <p className="text-sm text-slate-500 mb-6">{this.state.error?.message || 'Erro inesperado. Por favor recarregue a página.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white mx-auto"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', cursor: 'pointer' }}
          >
            <RefreshCw size={15} />
            Recarregar página
          </button>
        </div>
      </div>
    )
  }
}
