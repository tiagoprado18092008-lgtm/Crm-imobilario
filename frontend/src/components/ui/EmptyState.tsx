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
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && 'render' in (icon as any))) {
      const IconComponent = icon as React.ElementType
      return <IconComponent size={32} />
    }
    return icon as React.ReactNode
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-4 text-gray-300">
          {renderIcon()}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
