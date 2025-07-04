import * as React from "react"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
  className?: string
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
  className?: string
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function Card({ children, style, className, ...props }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card

export function CardHeader({ children, style, className, ...props }: CardHeaderProps) {
  return (
    <div
      style={{
        padding: '1.5rem 1.5rem 0 1.5rem',
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, style, className, ...props }: CardTitleProps) {
  return (
    <h3
      style={{
        fontSize: '1.25rem',
        fontWeight: '600',
        margin: 0,
        marginBottom: '0.5rem',
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ children, style, ...props }: CardDescriptionProps) {
  return (
    <p
      style={{
        color: '#6b7280',
        fontSize: '0.875rem',
        margin: 0,
        ...style
      }}
      {...props}
    >
      {children}
    </p>
  )
}

export function CardContent({ children, style, className, ...props }: CardContentProps) {
  return (
    <div
      style={{
        padding: '1.5rem',
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardFooter({ children, style, ...props }: CardFooterProps) {
  return (
    <div
      style={{
        padding: '0 1.5rem 1.5rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  )
}