import * as React from "react"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  children: React.ReactNode
  onClose?: () => void
  className?: string
}



const getAlertStyles = (variant: string) => {
  const variants = {
    info: 'background-color: #dbeafe; color: #1e40af; border: 1px solid #93c5fd;',
    success: 'background-color: #dcfce7; color: #166534; border: 1px solid #86efac;',
    warning: 'background-color: #fef3c7; color: #92400e; border: 1px solid #fbbf24;',
    error: 'background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;',
  }

  return `
    ${variants[variant as keyof typeof variants]}
    padding: 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    position: relative;
  `
}

export function Alert({ 
  variant = 'info', 
  children, 
  onClose,
  style,
  className,
  ...props 
}: AlertProps) {
  const alertStyles = getAlertStyles(variant)
  
  return (
    <div
      style={{
        ...Object.fromEntries(
          alertStyles.split(';').map(s => s.split(':').map(p => p.trim())).filter(p => p.length === 2)
        ),
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: 'inherit',
            padding: '0.25rem'
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

export default Alert

// Keep backward compatibility
export function AlertDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div style={{ marginTop: '0.5rem' }} className={className}>{children}</div>
}

