"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2, Package, Truck } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  color?: "primary" | "secondary" | "success" | "warning" | "error";
}

export function LoadingSpinner({ 
  size = "md", 
  className,
  color = "primary" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  };

  const colorClasses = {
    primary: "text-blue-600",
    secondary: "text-gray-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    error: "text-red-600"
  };

  return (
    <Loader2 
      className={cn(
        "animate-spin",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  );
}

interface LoadingDotsProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  color?: "primary" | "secondary" | "success" | "warning" | "error";
}

export function LoadingDots({ 
  size = "md", 
  className,
  color = "primary" 
}: LoadingDotsProps) {
  const sizeClasses = {
    sm: "h-1 w-1",
    md: "h-2 w-2",
    lg: "h-3 w-3"
  };

  const colorClasses = {
    primary: "bg-blue-600",
    secondary: "bg-gray-600",
    success: "bg-green-600",
    warning: "bg-yellow-600",
    error: "bg-red-600"
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div 
        className={cn(
          "rounded-full animate-bounce",
          sizeClasses[size],
          colorClasses[color]
        )}
        style={{ animationDelay: "0ms" }}
      />
      <div 
        className={cn(
          "rounded-full animate-bounce",
          sizeClasses[size],
          colorClasses[color]
        )}
        style={{ animationDelay: "150ms" }}
      />
      <div 
        className={cn(
          "rounded-full animate-bounce",
          sizeClasses[size],
          colorClasses[color]
        )}
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

interface LoadingBarProps {
  progress?: number;
  className?: string;
  color?: "primary" | "secondary" | "success" | "warning" | "error";
  animated?: boolean;
}

export function LoadingBar({ 
  progress, 
  className,
  color = "primary",
  animated = true
}: LoadingBarProps) {
  const colorClasses = {
    primary: "bg-blue-600",
    secondary: "bg-gray-600",
    success: "bg-green-600",
    warning: "bg-yellow-600",
    error: "bg-red-600"
  };

  return (
    <div className={cn("w-full bg-gray-200 rounded-full h-2", className)}>
      <div 
        className={cn(
          "h-2 rounded-full transition-all duration-300",
          colorClasses[color],
          animated && !progress && "animate-pulse"
        )}
        style={{ 
          width: progress ? `${progress}%` : animated ? "100%" : "0%" 
        }}
      />
    </div>
  );
}

interface LoadingCardProps {
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function LoadingCard({ 
  title = "Loading...", 
  description,
  className,
  children 
}: LoadingCardProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm",
      className
    )}>
      <LoadingSpinner size="lg" className="mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 text-center">{description}</p>
      )}
      {children}
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animated?: boolean;
}

export function LoadingSkeleton({ 
  className,
  variant = "text",
  width,
  height,
  animated = true
}: LoadingSkeletonProps) {
  const baseClasses = "bg-gray-200";
  const animationClasses = animated ? "animate-pulse" : "";
  
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg"
  };

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div 
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses,
        variant === "text" && !height && "h-4",
        variant === "circular" && !width && !height && "h-10 w-10",
        variant === "rectangular" && !height && "h-32",
        className
      )}
      style={style}
    />
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  spinnerSize?: "sm" | "md" | "lg" | "xl";
  message?: string;
  blur?: boolean;
}

export function LoadingOverlay({
  isLoading,
  children,
  className,
  spinnerSize = "lg",
  message = "Loading...",
  blur = true
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className={cn(
          "absolute inset-0 bg-white/80 flex items-center justify-center z-50",
          blur && "backdrop-blur-sm"
        )}>
          <div className="text-center">
            <LoadingSpinner size={spinnerSize} className="mb-2" />
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface SafeShipperLoadingProps {
  message?: string;
  showLogo?: boolean;
  className?: string;
}

export function SafeShipperLoading({ 
  message = "Loading SafeShipper...", 
  showLogo = true,
  className 
}: SafeShipperLoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      {showLogo && (
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <div className="text-white font-bold text-2xl">SS</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">SafeShipper</div>
            <div className="text-sm text-gray-600">Dangerous Goods Logistics</div>
          </div>
        </div>
      )}
      
      <LoadingSpinner size="lg" className="mb-4" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}

// Page-specific loading components
export function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <LoadingSkeleton width="200px" height="32px" />
          <LoadingSkeleton width="300px" height="20px" />
        </div>
        <div className="flex gap-2">
          <LoadingSkeleton width="80px" height="36px" />
          <LoadingSkeleton width="100px" height="36px" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
            <LoadingSkeleton width="100px" height="16px" className="mb-2" />
            <LoadingSkeleton width="60px" height="24px" className="mb-2" />
            <LoadingSkeleton width="80px" height="14px" />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
            <LoadingSkeleton width="150px" height="20px" className="mb-4" />
            <LoadingSkeleton width="100%" height="200px" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        <LoadingSkeleton width="40px" height="20px" />
        <LoadingSkeleton width="120px" height="20px" />
        <LoadingSkeleton width="100px" height="20px" />
        <LoadingSkeleton width="80px" height="20px" />
        <LoadingSkeleton width="60px" height="20px" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <LoadingSkeleton width="40px" height="16px" />
          <LoadingSkeleton width="120px" height="16px" />
          <LoadingSkeleton width="100px" height="16px" />
          <LoadingSkeleton width="80px" height="16px" />
          <LoadingSkeleton width="60px" height="16px" />
        </div>
      ))}
    </div>
  );
}

export function CardLoading({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <LoadingSkeleton variant="circular" width="40px" height="40px" />
              <div>
                <LoadingSkeleton width="150px" height="20px" className="mb-2" />
                <LoadingSkeleton width="100px" height="16px" />
              </div>
            </div>
            <LoadingSkeleton width="80px" height="24px" />
          </div>
          <LoadingSkeleton width="100%" height="60px" />
        </div>
      ))}
    </div>
  );
}

// Custom hook for loading states
export function useLoading(initialState: boolean = false) {
  const [isLoading, setIsLoading] = React.useState(initialState);
  
  const startLoading = React.useCallback(() => setIsLoading(true), []);
  const stopLoading = React.useCallback(() => setIsLoading(false), []);
  const toggleLoading = React.useCallback(() => setIsLoading(prev => !prev), []);
  
  return {
    isLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    setIsLoading
  };
}

// Hook for async operations with loading
export function useAsyncLoading() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  const execute = React.useCallback(async (asyncFunction: () => Promise<any>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    isLoading,
    error,
    execute,
    clearError: () => setError(null)
  };
}