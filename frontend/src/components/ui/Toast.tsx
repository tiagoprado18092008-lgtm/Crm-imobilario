import React, { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useUIStore } from '../../store/ui.store'

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />
}

const bgClasses = {
  success: 'border-l-4 border-green-500',
  error: 'border-l-4 border-red-500',
  info: 'border-l-4 border-blue-500'
}

export const Toast: React.FC = () => {
  const { toast, clearToast } = useUIStore()

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => clearToast(), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom-2">
      <div
        className={`
          flex items-start gap-3 bg-white shadow-lg rounded-lg px-4 py-3 min-w-64 max-w-sm
          ${bgClasses[toast.type]}
        `}
      >
        {icons[toast.type]}
        <p className="text-sm text-gray-800 flex-1 font-medium">{toast.message}</p>
        <button
          onClick={clearToast}
          className="text-gray-400 hover:text-gray-600 mt-0.5 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
