import React from 'react'
import { Mail, MessageCircle, Phone, Users, FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { Interaction } from '../../types'
import { Badge } from '../ui/Badge'
import { formatDateTime, formatDate } from '../../utils/formatters'
import { INTERACTION_TYPE_LABELS } from '../../utils/constants'

const typeIcons: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="w-4 h-4 text-blue-500" />,
  WHATSAPP: <MessageCircle className="w-4 h-4 text-green-500" />,
  CALL: <Phone className="w-4 h-4 text-orange-500" />,
  MEETING: <Users className="w-4 h-4 text-purple-500" />,
  NOTE: <FileText className="w-4 h-4 text-gray-500" />
}

const typeBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'purple' | 'default'> = {
  EMAIL: 'info',
  WHATSAPP: 'success',
  CALL: 'warning',
  MEETING: 'purple',
  NOTE: 'default'
}

interface InteractionLogProps {
  interactions: Interaction[]
}

function groupByDate(interactions: Interaction[]): Record<string, Interaction[]> {
  const groups: Record<string, Interaction[]> = {}
  for (const i of interactions) {
    const date = formatDate(i.createdAt)
    if (!groups[date]) groups[date] = []
    groups[date].push(i)
  }
  return groups
}

export const InteractionLog: React.FC<InteractionLogProps> = ({ interactions }) => {
  if (interactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Sem interações registadas
      </div>
    )
  }

  const groups = groupByDate([...interactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ))

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([date, items]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-500 px-2">{date}</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="space-y-2">
            {items.map((interaction) => (
              <div
                key={interaction.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {typeIcons[interaction.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={typeBadgeVariant[interaction.type]} small>
                      {INTERACTION_TYPE_LABELS[interaction.type]}
                    </Badge>
                    {interaction.subject && (
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {interaction.subject}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                      {formatDateTime(interaction.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{interaction.body}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {interaction.createdBy && (
                      <span className="text-xs text-gray-400">
                        por {interaction.createdBy.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      {interaction.direction === 'IN' ? (
                        <><ArrowDownLeft className="w-3 h-3 text-green-500" /> Recebido</>
                      ) : (
                        <><ArrowUpRight className="w-3 h-3 text-blue-500" /> Enviado</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
