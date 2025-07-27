// Demo component to test hazard symbols with official images
"use client";

import React from 'react';
import { HazardSymbol, HazardClassBadge } from './hazard-symbol';

export function HazardSymbolDemo() {
  const explosivesClasses = ['1', '1.4', '1.5', '1.6'];
  const gasClasses = ['2.1', '2.1A', '2.1S', '2.2', '2.3', '2.5Z'];
  const flammableClasses = ['3', '3A', '4.1', '4.2', '4.3'];
  const oxidizersClasses = ['5.1', '5.1Z', '5.2', '5.2.1'];
  const toxicClasses = ['6.1', '6.2'];
  const radioactiveClasses = ['7', '7A', '7B', '7C', '7D', '7E'];
  const otherClasses = ['8', '9', '9A', '10'];

  const SymbolGrid = ({ title, classes }: { title: string; classes: string[] }) => (
    <div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="grid grid-cols-4 gap-4">
        {classes.map((hazardClass) => (
          <div key={hazardClass} className="flex flex-col items-center space-y-2">
            <HazardSymbol hazardClass={hazardClass} size="md" useImages={true} />
            <span className="text-xs font-medium text-center">Class {hazardClass}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Complete Dangerous Goods Symbol Collection</h1>
        <p className="text-gray-600">Official JPG symbols for all hazard classes with variants</p>
      </div>

      <SymbolGrid title="Class 1: Explosives" classes={explosivesClasses} />
      <SymbolGrid title="Class 2: Gases" classes={gasClasses} />
      <SymbolGrid title="Class 3 & 4: Flammable Liquids & Solids" classes={flammableClasses} />
      <SymbolGrid title="Class 5: Oxidizers & Organic Peroxides" classes={oxidizersClasses} />
      <SymbolGrid title="Class 6: Toxic & Infectious Substances" classes={toxicClasses} />
      <SymbolGrid title="Class 7: Radioactive Materials" classes={radioactiveClasses} />
      <SymbolGrid title="Class 8, 9 & 10: Corrosive, Miscellaneous & Special" classes={otherClasses} />

      <div>
        <h3 className="text-lg font-semibold mb-3">Comparison: Image vs Text Mode</h3>
        <div className="grid grid-cols-6 gap-4">
          {['3', '6.1', '7', '8', '9'].map((hazardClass) => (
            <div key={hazardClass} className="flex flex-col items-center space-y-4">
              <div className="flex flex-col items-center space-y-1">
                <HazardSymbol hazardClass={hazardClass} size="md" useImages={true} />
                <span className="text-xs">Image</span>
              </div>
              <div className="flex flex-col items-center space-y-1">
                <HazardSymbol hazardClass={hazardClass} size="md" useImages={false} />
                <span className="text-xs">Text</span>
              </div>
              <span className="text-xs font-medium">Class {hazardClass}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}