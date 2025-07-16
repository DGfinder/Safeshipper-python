"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface HazardSymbolProps {
  hazardClass: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  useImages?: boolean; // Toggle between image symbols and text fallback
}

const hazardClassConfig: Record<string, { color: string; text: string; symbol: string; label: string; symbolPath?: string }> = {
  // Class 1: Explosives
  '1': { color: 'bg-orange-500', text: 'white', symbol: '💥', label: 'Explosive', symbolPath: '/hazard-symbols/class-1.jpg' },
  '1.1': { color: 'bg-orange-600', text: 'white', symbol: '💥', label: 'Explosive 1.1' },
  '1.2': { color: 'bg-orange-500', text: 'white', symbol: '💥', label: 'Explosive 1.2' },
  '1.3': { color: 'bg-orange-400', text: 'white', symbol: '💥', label: 'Explosive 1.3' },
  '1.4': { color: 'bg-orange-300', text: 'black', symbol: '💥', label: 'Explosive 1.4', symbolPath: '/hazard-symbols/class-1-4.jpg' },
  '1.5': { color: 'bg-orange-600', text: 'white', symbol: '💥', label: 'Explosive 1.5', symbolPath: '/hazard-symbols/class-1-5.jpg' },
  '1.6': { color: 'bg-orange-700', text: 'white', symbol: '💥', label: 'Explosive 1.6', symbolPath: '/hazard-symbols/class-1-6.jpg' },
  
  // Class 2: Gases
  '2': { color: 'bg-green-500', text: 'white', symbol: '🌪️', label: 'Gas' },
  '2.1': { color: 'bg-red-500', text: 'white', symbol: '🔥', label: 'Flammable Gas', symbolPath: '/hazard-symbols/class-2-1.jpg' },
  '2.1A': { color: 'bg-red-500', text: 'white', symbol: '🔥', label: 'Flammable Gas (A)', symbolPath: '/hazard-symbols/class-2-1a.jpg' },
  '2.1S': { color: 'bg-red-500', text: 'white', symbol: '🔥', label: 'Flammable Gas (S)', symbolPath: '/hazard-symbols/class-2-1s.jpg' },
  '2.2': { color: 'bg-green-500', text: 'white', symbol: '🌪️', label: 'Non-Flammable Gas', symbolPath: '/hazard-symbols/class-2-2.jpg' },
  '2.3': { color: 'bg-gray-800', text: 'white', symbol: '☠️', label: 'Toxic Gas', symbolPath: '/hazard-symbols/class-2-3.jpg' },
  '2.5Z': { color: 'bg-blue-500', text: 'white', symbol: '🌪️', label: 'Gas (Special)', symbolPath: '/hazard-symbols/class-2-5z.jpg' },
  
  // Class 3: Flammable Liquids
  '3': { color: 'bg-red-600', text: 'white', symbol: '🔥', label: 'Flammable Liquid', symbolPath: '/hazard-symbols/class-3.jpg' },
  '3A': { color: 'bg-red-600', text: 'white', symbol: '🔥', label: 'Flammable Liquid (A)', symbolPath: '/hazard-symbols/class-3a.jpg' },
  
  // Class 4: Flammable Solids
  '4': { color: 'bg-yellow-500', text: 'black', symbol: '🔥', label: 'Flammable Solid' },
  '4.1': { color: 'bg-yellow-500', text: 'black', symbol: '🔥', label: 'Flammable Solid', symbolPath: '/hazard-symbols/class-4-1.jpg' },
  '4.2': { color: 'bg-yellow-600', text: 'white', symbol: '🔥', label: 'Spontaneously Combustible', symbolPath: '/hazard-symbols/class-4-2.jpg' },
  '4.3': { color: 'bg-blue-500', text: 'white', symbol: '💧', label: 'Dangerous When Wet', symbolPath: '/hazard-symbols/class-4-3.png' },
  
  // Class 5: Oxidizers
  '5': { color: 'bg-yellow-400', text: 'black', symbol: '⚡', label: 'Oxidizer' },
  '5.1': { color: 'bg-yellow-400', text: 'black', symbol: '⚡', label: 'Oxidizer', symbolPath: '/hazard-symbols/class-5-1.jpg' },
  '5.1Z': { color: 'bg-yellow-400', text: 'black', symbol: '⚡', label: 'Oxidizer (Z)', symbolPath: '/hazard-symbols/class-5-1z.jpg' },
  '5.2': { color: 'bg-yellow-300', text: 'black', symbol: '⚡', label: 'Organic Peroxide', symbolPath: '/hazard-symbols/class-5-2.jpg' },
  '5.2.1': { color: 'bg-yellow-300', text: 'black', symbol: '⚡', label: 'Organic Peroxide 5.2.1', symbolPath: '/hazard-symbols/class-5-2-1.jpg' },
  
  // Class 6: Toxic Substances
  '6': { color: 'bg-gray-800', text: 'white', symbol: '☠️', label: 'Toxic' },
  '6.1': { color: 'bg-gray-800', text: 'white', symbol: '☠️', label: 'Toxic', symbolPath: '/hazard-symbols/class-6-1.jpg' },
  '6.2': { color: 'bg-blue-700', text: 'white', symbol: '🦠', label: 'Infectious', symbolPath: '/hazard-symbols/class-6-2.jpg' },
  
  // Class 7: Radioactive
  '7': { color: 'bg-yellow-300', text: 'black', symbol: '☢️', label: 'Radioactive', symbolPath: '/hazard-symbols/class-7.jpg' },
  '7A': { color: 'bg-yellow-300', text: 'black', symbol: '☢️', label: 'Radioactive Category A', symbolPath: '/hazard-symbols/class-7a.jpg' },
  '7B': { color: 'bg-yellow-300', text: 'black', symbol: '☢️', label: 'Radioactive Category B', symbolPath: '/hazard-symbols/class-7b.jpg' },
  '7C': { color: 'bg-yellow-300', text: 'black', symbol: '☢️', label: 'Radioactive Category C', symbolPath: '/hazard-symbols/class-7c.jpg' },
  '7D': { color: 'bg-yellow-300', text: 'black', symbol: '☢️', label: 'Radioactive Category D', symbolPath: '/hazard-symbols/class-7d.jpg' },
  '7E': { color: 'bg-yellow-300', text: 'black', symbol: '☢️', label: 'Radioactive Category E', symbolPath: '/hazard-symbols/class-7e.jpg' },
  
  // Class 8: Corrosive
  '8': { color: 'bg-gray-600', text: 'white', symbol: '⚗️', label: 'Corrosive', symbolPath: '/hazard-symbols/class-8.jpg' },
  
  // Class 9: Miscellaneous
  '9': { color: 'bg-purple-500', text: 'white', symbol: '⚠️', label: 'Miscellaneous', symbolPath: '/hazard-symbols/class-9.jpg' },
  '9A': { color: 'bg-purple-500', text: 'white', symbol: '⚠️', label: 'Miscellaneous 9A', symbolPath: '/hazard-symbols/class-9a.jpg' },
  
  // Class 10: Special
  '10': { color: 'bg-gray-500', text: 'white', symbol: '🚫', label: 'Special Category', symbolPath: '/hazard-symbols/class-10.jpg' },
  
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

export function HazardSymbol({ hazardClass, size = 'md', className, useImages = true }: HazardSymbolProps) {
  const normalizedClass = hazardClass.toUpperCase().trim();
  const config = hazardClassConfig[normalizedClass] || hazardClassConfig['9']; // Default to miscellaneous
  
  // Use image symbol if available and useImages is true
  if (useImages && config.symbolPath) {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          sizeConfig[size],
          className
        )}
        title={config.label}
      >
        <img
          src={config.symbolPath}
          alt={`${config.label} (Class ${normalizedClass})`}
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback to text symbol if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        {/* Fallback text symbol - hidden by default, shown if image fails */}
        <div className="hidden w-full h-full flex items-center justify-center rounded font-bold transform rotate-45 border-2 border-black bg-gray-200 text-black">
          <div className="transform -rotate-45 flex items-center justify-center">
            <span className="text-xs font-bold">{normalizedClass}</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Fallback to original text-based symbol
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
export function HazardClassBadge({ hazardClass, size = 'sm', className, useImages = false }: HazardSymbolProps) {
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