import * as React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
  className?: string
}

const getButtonStyles = (variant: string, size: string) => {
  const variants = {
    primary: 'background-color: #3b82f6; color: white; border: none;',
    secondary: 'background-color: #6b7280; color: white; border: none;',
    outline: 'background-color: white; color: #374151; border: 1px solid #d1d5db;',
    ghost: 'background-color: transparent; color: #374151; border: none;',
    destructive: 'background-color: #ef4444; color: white; border: none;',
  }

  const sizes = {
    sm: 'padding: 0.375rem 0.75rem; font-size: 0.875rem;',
    md: 'padding: 0.5rem 1rem; font-size: 0.875rem;',
    lg: 'padding: 0.75rem 1.5rem; font-size: 1rem;',
  }

  return `
    ${variants[variant as keyof typeof variants]}
    ${sizes[size as keyof typeof sizes]}
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  `
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  disabled,
  children,
  style,
  className,
  ...props
}: ButtonProps) {
  const buttonStyles = getButtonStyles(variant, size)
  
  return (
    <button
      style={{
        ...Object.fromEntries(
          buttonStyles.split(';').map(s => s.split(':').map(p => p.trim())).filter(p => p.length === 2)
        ),
        opacity: disabled || loading ? '0.5' : '1',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        ...style
      }}
      className={className}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span style={{ 
          display: 'inline-block',
          width: '1rem',
          height: '1rem',
          border: '2px solid currentColor',
          borderRightColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      )}
      {children}
    </button>
  )
}

export default Button
