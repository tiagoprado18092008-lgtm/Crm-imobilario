import React from 'react'

interface CardProps {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  padding?: boolean
  style?: React.CSSProperties
}

export const Card: React.FC<CardProps> = ({
  title,
  action,
  children,
  className = '',
  padding = true,
  style,
}) => {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 16,
        border: '1px solid var(--border-color)',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        ...style,
      }}
    >
      {(title || action) && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {title && (
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {title}
            </h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={padding ? { padding: 20 } : {}}>{children}</div>
    </div>
  )
}
