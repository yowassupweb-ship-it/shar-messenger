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
      background: 'linear-gradient(135deg, var(--glass-blue, #89b4fa) 0%, var(--glass-lavender, #b4befe) 100%)',
      color: '#0f0f23',
      fontWeight: 600,
      boxShadow: '0 4px 15px 0 rgba(137, 180, 250, 0.3)'
    },
    secondary: {
      background: 'rgba(137, 180, 250, 0.1)',
      color: 'var(--glass-text-primary, #cdd6f4)',
      border: '1px solid rgba(137, 180, 250, 0.2)'
    },
    danger: {
      background: 'linear-gradient(135deg, var(--glass-red, #f38ba8) 0%, #f5c2e7 100%)',
      color: '#0f0f23',
      fontWeight: 600,
      boxShadow: '0 4px 15px 0 rgba(243, 139, 168, 0.3)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--glass-text-secondary, #bac2de)',
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
