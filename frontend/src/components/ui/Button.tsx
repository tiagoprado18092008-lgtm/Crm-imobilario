import React from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #1a2e4a, #243d5e)',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    background: 'var(--bg-page)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
  },
  danger: {
    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    color: '#fff',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '5px 12px', fontSize: 12 },
  md: { padding: '8px 16px', fontSize: 13 },
  lg: { padding: '11px 24px', fontSize: 14 },
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  style,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontWeight: 600,
        borderRadius: 8,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        transition: 'opacity 150ms, transform 80ms',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      className={className}
    >
      {loading && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
      {children}
    </button>
  )
}
