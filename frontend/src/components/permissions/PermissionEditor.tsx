import React from 'react'
import type { PermissionMap } from '../../types'

interface PermissionEditorProps {
  value: PermissionMap
  onChange: (map: PermissionMap) => void
  disabled?: boolean
  onReset?: () => void
}

const MODULES = [
  { key: 'contacts', label: 'Contactos' },
  { key: 'opportunities', label: 'Negócios' },
  { key: 'properties', label: 'Imóveis' },
  { key: 'tasks', label: 'Tarefas' },
  { key: 'appointments', label: 'Agendamentos' },
  { key: 'conversations', label: 'Conversas' },
  { key: 'campaigns', label: 'Campanhas' },
  { key: 'forms', label: 'Formulários' },
  { key: 'automations', label: 'Automações' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'settings', label: 'Configurações' },
  { key: 'users', label: 'Equipa' },
]

const ACTIONS = [
  { key: 'view', label: 'Ver' },
  { key: 'create', label: 'Criar' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Eliminar' },
  { key: 'export', label: 'Exportar' },
]

export const PermissionEditor: React.FC<PermissionEditorProps> = ({
  value,
  onChange,
  disabled = false,
  onReset,
}) => {
  const toggle = (module: string, action: string) => {
    if (disabled) return
    const current = value[module] ?? []
    const hasAction = current.includes(action)
    const updated = hasAction
      ? current.filter((a) => a !== action)
      : [...current, action]
    onChange({ ...value, [module]: updated })
  }

  const toggleModule = (module: string, enable: boolean) => {
    if (disabled) return
    if (enable) {
      onChange({ ...value, [module]: ACTIONS.map((a) => a.key) })
    } else {
      onChange({ ...value, [module]: [] })
    }
  }

  return (
    <div className="overflow-x-auto">
      {onReset && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            Usar permissões padrão
          </button>
        </div>
      )}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-3 py-2 font-medium text-gray-600 w-36">Módulo</th>
            <th className="text-center px-2 py-2 font-medium text-gray-600 w-10">Tudo</th>
            {ACTIONS.map((action) => (
              <th key={action.key} className="text-center px-2 py-2 font-medium text-gray-600 w-20">
                {action.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((mod, i) => {
            const modulePerms = value[mod.key] ?? []
            const allEnabled = ACTIONS.every((a) => modulePerms.includes(a.key))
            return (
              <tr key={mod.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-3 py-2 font-medium text-gray-700">{mod.label}</td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={allEnabled}
                    onChange={(e) => toggleModule(mod.key, e.target.checked)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer disabled:cursor-not-allowed"
                  />
                </td>
                {ACTIONS.map((action) => (
                  <td key={action.key} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={modulePerms.includes(action.key)}
                      onChange={() => toggle(mod.key, action.key)}
                      disabled={disabled}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
