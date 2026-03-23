import React from 'react'

interface CardProps {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export const Card: React.FC<CardProps> = ({
  title,
  action,
  children,
  className = '',
  padding = true
}) => {
  return (
    <div
      className={`bg-white rounded-2xl ${className}`}
      style={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f8fafc' }}>
          {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={padding ? 'p-6' : ''}>{children}</div>
    </div>
  )
}
