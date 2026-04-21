import React from 'react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  color?: string
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 40,
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '', color }) => {
  const px = sizeMap[size]
  const stroke = size === 'sm' ? 2 : size === 'md' ? 2.5 : 3
  const accentColor = color || 'var(--accent)'

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}
      role="status"
      aria-label="A carregar..."
    >
      <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth={stroke} />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={accentColor}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  )
}

export const PageSpinner: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
    <Spinner size="lg" />
  </div>
)
