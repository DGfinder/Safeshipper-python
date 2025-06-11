'use client'

import React from 'react'

interface DGHazardLabelProps {
  unNumber: string
  hazardClass: string
  size?: 'sm' | 'md' | 'lg'
}

const DG_CLASSIFICATIONS = {
  'UN1203': { class: '3', name: 'Flammable Liquid', color: 'bg-red-500', symbol: '🔥' },
  'UN1072': { class: '2.2', name: 'Non-Flammable Gas', color: 'bg-green-500', symbol: '⚪' },
  'UN1789': { class: '8', name: 'Corrosive', color: 'bg-black', symbol: '⚫' },
  'UN2794': { class: '8', name: 'Acids', color: 'bg-black', symbol: '⚫' },
  'UN1005': { class: '2.3', name: 'Toxic Gas', color: 'bg-red-600', symbol: '💀' },
  'UN2924': { class: '3', name: 'Flammable Liquid', color: 'bg-red-500', symbol: '🔥' },
  'UN1993': { class: '3', name: 'Flammable Liquid', color: 'bg-red-500', symbol: '🔥' },
  'UN2810': { class: '6.1', name: 'Toxic', color: 'bg-white border-2 border-black', symbol: '☠️' },
  'UN3077': { class: '9', name: 'Environmentally Hazardous', color: 'bg-white', symbol: '🌍' },
  'UN2187': { class: '2.1', name: 'Flammable Gas', color: 'bg-red-500', symbol: '🔥' }
}

export default function DGHazardLabel({ unNumber, hazardClass, size = 'md' }: DGHazardLabelProps) {
  const classification = DG_CLASSIFICATIONS[unNumber as keyof typeof DG_CLASSIFICATIONS]
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm', 
    lg: 'w-16 h-16 text-base'
  }

  if (!classification) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-400 rounded border-2 border-gray-600 flex flex-col items-center justify-center text-white font-bold`}>
        <div className="text-xs">DG</div>
      </div>
    )
  }

  return (
    <div className="relative group">
      {/* Main Hazard Placard */}
      <div className={`
        ${sizeClasses[size]} 
        ${classification.color} 
        rounded border-2 border-gray-800 
        flex flex-col items-center justify-center 
        text-white font-bold shadow-lg
        transform rotate-45 origin-center
      `}>
        {/* UN Number at top */}
        <div className="text-xs font-black transform -rotate-45">
          {unNumber.replace('UN', '')}
        </div>
        
        {/* Hazard Symbol */}
        <div className="text-lg transform -rotate-45">
          {getHazardSymbol(classification.class)}
        </div>
        
        {/* Class number at bottom */}
        <div className="text-xs font-black transform -rotate-45">
          {classification.class}
        </div>
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
        Class {classification.class}: {classification.name}
      </div>
    </div>
  )
}

function getHazardSymbol(hazardClass: string): string {
  switch (hazardClass) {
    case '1': return '💥' // Explosives
    case '2.1': return '🔥' // Flammable Gas
    case '2.2': return '⚪' // Non-flammable Gas 
    case '2.3': return '☠️' // Toxic Gas
    case '3': return '🔥' // Flammable Liquid
    case '4.1': return '🔥' // Flammable Solid
    case '4.2': return '🔥' // Spontaneously Combustible
    case '4.3': return '💧' // Dangerous When Wet
    case '5.1': return '🔥' // Oxidizer
    case '5.2': return '💥' // Organic Peroxide
    case '6.1': return '☠️' // Toxic
    case '6.2': return '☣️' // Infectious
    case '7': return '☢️' // Radioactive
    case '8': return '⚫' // Corrosive
    case '9': return '⚠️' // Miscellaneous
    default: return '⚠️'
  }
}

// Export the classification data for use in other components
export { DG_CLASSIFICATIONS } 