import React from 'react'
import { KanbanBoard } from '../components/kanban/KanbanBoard'

export const PipelinePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <KanbanBoard />
      </div>
    </div>
  )
}
