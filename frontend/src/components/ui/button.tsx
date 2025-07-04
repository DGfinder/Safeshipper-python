import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'default', 
  size = 'md',
  className = '',
  type = 'button'
}: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    default: "bg-[#153F9F] hover:bg-[#1230a0] text-white focus:ring-[#153F9F]",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-gray-500",
    destructive: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    ghost: "hover:bg-gray-100 text-gray-700 focus:ring-gray-500"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-md",
    md: "px-4 py-2 text-sm rounded-md",
    lg: "px-6 py-3 text-base rounded-md"
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

export const buttonVariants = {
  default: "bg-[#153F9F] hover:bg-[#1230a0] text-white",
  outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
  destructive: "bg-red-600 hover:bg-red-700 text-white",
  ghost: "hover:bg-gray-100 text-gray-700"
};
