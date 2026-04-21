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
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid #dce3ef',
        boxShadow: '0 2px 8px rgba(15,37,83,0.04), 0 12px 32px rgba(15,37,83,0.06)',
        ...style,
      }}
    >
      {(title || action) && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
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
