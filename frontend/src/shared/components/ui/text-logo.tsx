import React from 'react';
import { cn } from '@/lib/utils';

interface TextLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'light' | 'dark';
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export function TextLogo({ 
  className, 
  size = 'md', 
  variant = 'default' 
}: TextLogoProps) {
  const baseClasses = "font-bold tracking-tight select-none";
  const sizeClass = sizeClasses[size];
  
  const safeColor = variant === 'light' ? 'text-white' : 'text-[#153F9F]';
  const shipperColor = variant === 'light' ? 'text-white/90' : 'text-[#2D2D2D]';
  
  return (
    <div className={cn(baseClasses, sizeClass, className)}>
      <span className={safeColor}>Safe</span>
      <span className={shipperColor}>Shipper</span>
    </div>
  );
}