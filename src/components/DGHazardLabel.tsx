import React from 'react'

interface DGHazardLabelProps {
  hazardClass: string
  unNumber?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function DGHazardLabel({ 
  hazardClass, 
  unNumber, 
  size = 'md' 
}: DGHazardLabelProps) {
  const getClassColor = (className: string) => {
    const classMap: { [key: string]: string } = {
      '1': '#FF6B35', // Explosives - Orange
      '2': '#00A86B', // Gases - Green
      '3': '#FF0000', // Flammable liquids - Red
      '4': '#FFD700', // Flammable solids - Yellow
      '5': '#1E90FF', // Oxidizers - Blue
      '6': '#800080', // Toxic - Purple
      '7': '#FFFF00', // Radioactive - Yellow
      '8': '#000000', // Corrosive - Black
      '9': '#808080'  // Miscellaneous - Gray
    }
    return classMap[className] || '#6b7280'
  }

  const sizeStyles = {
    sm: { width: '40px', height: '40px', fontSize: '0.75rem' },
    md: { width: '60px', height: '60px', fontSize: '0.875rem' },
    lg: { width: '80px', height: '80px', fontSize: '1rem' }
  }

  const color = getClassColor(hazardClass)
  const styles = sizeStyles[size]

  return (
    <div style={{
      ...styles,
      backgroundColor: color,
      color: color === '#FFFF00' || color === '#FFD700' ? '#000' : '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '0.375rem',
      border: '2px solid #000',
      fontWeight: 'bold',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: styles.fontSize }}>
        CLASS
      </div>
      <div style={{ fontSize: `calc(${styles.fontSize} * 1.2)` }}>
        {hazardClass}
      </div>
      {unNumber && (
        <div style={{ fontSize: `calc(${styles.fontSize} * 0.8)` }}>
          {unNumber}
        </div>
      )}
    </div>
  )
} 