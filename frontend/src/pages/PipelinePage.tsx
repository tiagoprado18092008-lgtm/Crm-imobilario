import React from 'react'
import { KanbanBoard } from '../components/kanban/KanbanBoard'

export const PipelinePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <KanbanBoard />
    </div>
  )
}
