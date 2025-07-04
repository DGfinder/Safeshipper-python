import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'
  children: React.ReactNode
  className?: string
}

const getBadgeStyles = (variant: string) => {
  const variants = {
    default: 'background-color: #374151; color: white;',
    success: 'background-color: #10b981; color: white;',
    warning: 'background-color: #f59e0b; color: white;',
    error: 'background-color: #ef4444; color: white;',
    info: 'background-color: #3b82f6; color: white;',
    outline: 'background-color: transparent; color: #374151; border: 1px solid #d1d5db;',
  }

  return `
    ${variants[variant as keyof typeof variants]}
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  `
}

export function Badge({ 
  variant = 'default', 
  children, 
  style,
  className,
  ...props 
}: BadgeProps) {
  const badgeStyles = getBadgeStyles(variant)
  
  return (
    <span
      style={{
        ...Object.fromEntries(
          badgeStyles.split(';').map(s => s.split(':').map(p => p.trim())).filter(p => p.length === 2)
        ),
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge
