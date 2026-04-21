import React from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode | React.ElementType
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  action?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
}) => {
  const renderIcon = () => {
    if (!icon) return null
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && 'render' in (icon as object))) {
      const IconComponent = icon as React.ElementType
      return <IconComponent size={36} />
    }
    return icon as React.ReactNode
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      textAlign: 'center',
      fontFamily: 'var(--font-body)',
    }}>
      {icon && (
        <div style={{
          marginBottom: 16,
          color: 'var(--border-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'var(--surface-3)',
        }}>
          {renderIcon()}
        </div>
      )}
      <h3 style={{
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-display)',
        margin: '0 0 6px',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          maxWidth: 320,
          lineHeight: 1.5,
          margin: '0 0 20px',
        }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: description ? 0 : 16 }}>{action}</div>}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
