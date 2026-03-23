import React from 'react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10'
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`
        animate-spin rounded-full border-2 border-blue-200 border-t-blue-600
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      aria-label="A carregar..."
    />
  )
}

export const PageSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner size="lg" />
  </div>
)
