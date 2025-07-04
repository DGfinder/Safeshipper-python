import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}

export const Alert = ({ 
  children, 
  variant = 'default', 
  className = '' 
}: AlertProps) => {
  const baseStyles = "border rounded-lg p-4 flex items-start gap-3";
  
  const variants = {
    default: "bg-blue-50 border-blue-200 text-blue-800",
    destructive: "bg-red-50 border-red-200 text-red-800"
  };
  
  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};

export const AlertDescription = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) => (
  <div className={`text-sm ${className}`}>
    {children}
  </div>
);