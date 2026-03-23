import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  small?: boolean
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  danger:  'bg-red-50 text-red-700 ring-1 ring-red-200',
  info:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  default: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  purple:  'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  small = false,
  children,
  className = ''
}) => {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
