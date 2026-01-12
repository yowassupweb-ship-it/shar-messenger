'use client'

interface GlassButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export default function GlassButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  className = ''
}: GlassButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2 text-base',
    lg: 'px-8 py-3 text-lg'
  }[size]

  const variantStyles = {
    primary: {
      background: '#4a9eff',
      color: 'white',
      fontWeight: 500,
      boxShadow: '0 2px 8px rgba(74, 158, 255, 0.3)'
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.08)',
      color: '#e0e0e0',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    danger: {
      background: '#dc3545',
      color: 'white',
      fontWeight: 500,
      boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
    },
    ghost: {
      background: 'transparent',
      color: '#888888',
      border: '1px solid transparent'
    }
  }[variant]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${sizeClasses} rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 ${className}`}
      style={variantStyles}
    >
      {children}
    </button>
  )
}
