"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface HazardSymbolProps {
  hazardClass: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const hazardClassConfig: Record<string, { color: string; text: string; symbol: string; label: string }> = {
  // Class 1: Explosives
  '1': { color: 'bg-orange-500', text: 'white', symbol: '💥', label: 'Explosive' },
  '1.1': { color: 'bg-orange-600', text: 'white', symbol: '💥', label: 'Explosive 1.1' },
  '1.2': { color: 'bg-orange-500', text: 'white', symbol: '💥', label: 'Explosive 1.2' },
  '1.3': { color: 'bg-orange-400', text: 'white', symbol: '💥', label: 'Explosive 1.3' },
  '1.4': { color: 'bg-orange-300', text: 'black', symbol: '💥', label: 'Explosive 1.4' },
  '1.5': { color: 'bg-orange-600', text: 'white', symbol: '💥', label: 'Explosive 1.5' },
  '1.6': { color: 'bg-orange-700', text: 'white', symbol: '💥', label: 'Explosive 1.6' },
  
  // Class 2: Gases
  '2': { color: 'bg-green-500', text: 'white', symbol: '🌪️', label: 'Gas' },
  '2.1': { color: 'bg-red-500', text: 'white', symbol: '🔥', label: 'Flammable Gas' },
  '2.2': { color: 'bg-green-500', text: 'white', symbol: '🌪️', label: 'Non-Flammable Gas' },
  '2.3': { color: 'bg-gray-800', text: 'white', symbol: '☠️', label: 'Toxic Gas' },
  
  // Class 3: Flammable Liquids
  '3': { color: 'bg-red-600', text: 'white', symbol: '🔥', label: 'Flammable Liquid' },
  
  // Class 4: Flammable Solids
  '4': { color: 'bg-yellow-500', text: 'black', symbol: '🔥', label: 'Flammable Solid' },
  '4.1': { color: 'bg-yellow-500', text: 'black', symbol: '🔥', label: 'Flammable Solid' },
  '4.2': { color: 'bg-yellow-600', text: 'white', symbol: '🔥', label: 'Spontaneously Combustible' },
  '4.3': { color: 'bg-blue-500', text: 'white', symbol: '💧', label: 'Dangerous When Wet' },
  
  // Class 5: Oxidizers
  '5': { color: 'bg-yellow-400', text: 'black', symbol: '⚡', label: 'Oxidizer' },
  '5.1': { color: 'bg-yellow-400', text: 'black', symbol: '⚡', label: 'Oxidizer' },
  '5.2': { color: 'bg-yellow-300', text: 'black', symbol: '⚡', label: 'Organic Peroxide' },
  
  // Class 6: Toxic Substances
  '6': { color: 'bg-gray-800', text: 'white', symbol: '☠️', label: 'Toxic' },
  '6.1': { color: 'bg-gray-800', text: 'white', symbol: '☠️', label: 'Toxic' },
  '6.2': { color: 'bg-blue-700', text: 'white', symbol: '🦠', label: 'Infectious' },
  
  // Class 7: Radioactive
  '7': { color: 'bg-yellow-300', text: 'black', symbol: '☢️', label: 'Radioactive' },
  
  // Class 8: Corrosive
  '8': { color: 'bg-gray-600', text: 'white', symbol: '⚗️', label: 'Corrosive' },
  
  // Class 9: Miscellaneous
  '9': { color: 'bg-purple-500', text: 'white', symbol: '⚠️', label: 'Miscellaneous' },
  
  // Special cases
  'FLAMMABLE': { color: 'bg-red-600', text: 'white', symbol: '🔥', label: 'Flammable' },
  'COMBUSTIBLE': { color: 'bg-orange-500', text: 'white', symbol: '🔥', label: 'Combustible' },
  'OXIDIZER': { color: 'bg-yellow-400', text: 'black', symbol: '⚡', label: 'Oxidizer' },
  'POISON': { color: 'bg-gray-800', text: 'white', symbol: '☠️', label: 'Poison' },
  'TOXIC': { color: 'bg-gray-800', text: 'white', symbol: '☠️', label: 'Toxic' },
};

const sizeConfig = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export function HazardSymbol({ hazardClass, size = 'md', className }: HazardSymbolProps) {
  const normalizedClass = hazardClass.toUpperCase().trim();
  const config = hazardClassConfig[normalizedClass] || hazardClassConfig['9']; // Default to miscellaneous
  
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded font-bold',
        'transform rotate-45 border-2 border-black',
        config.color,
        config.text === 'white' ? 'text-white' : 'text-black',
        sizeConfig[size],
        className
      )}
      title={config.label}
    >
      <div className="transform -rotate-45 flex items-center justify-center">
        <span className="text-xs font-bold">{normalizedClass}</span>
      </div>
    </div>
  );
}

// Alternative simple badge version for inline use
export function HazardClassBadge({ hazardClass, size = 'sm', className }: HazardSymbolProps) {
  const normalizedClass = hazardClass.toUpperCase().trim();
  const config = hazardClassConfig[normalizedClass] || hazardClassConfig['9'];
  
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded px-2 py-1 text-xs font-semibold',
        config.color,
        config.text === 'white' ? 'text-white' : 'text-black',
        className
      )}
      title={config.label}
    >
      {normalizedClass}
    </span>
  );
}

// Get color class for styling purposes
export function getHazardClassColor(hazardClass: string): string {
  const normalizedClass = hazardClass.toUpperCase().trim();
  const config = hazardClassConfig[normalizedClass] || hazardClassConfig['9'];
  return config.color;
}

export default HazardSymbol;