'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/shared/lib/utils';

interface TouchPosition {
  x: number;
  y: number;
}

interface SwipeGestureProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  threshold?: number;
  longPressDelay?: number;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  disabled?: boolean;
}

// Hook for detecting touch gestures
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  onDoubleTap,
  onLongPress,
  threshold = 50,
  longPressDelay = 500,
}: Omit<SwipeGestureProps, 'children' | 'className' | 'disabled'>) {
  const touchStartRef = useRef<TouchPosition | null>(null);
  const touchTimeRef = useRef<number>(0);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout>();
  const initialDistanceRef = useRef<number>(0);
  const isMultiTouchRef = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const now = Date.now();
    
    if (e.touches.length === 1) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      touchTimeRef.current = now;
      isMultiTouchRef.current = false;

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          onLongPress();
        }, longPressDelay);
      }

      // Check for double tap
      if (onDoubleTap && now - lastTapRef.current < 300) {
        onDoubleTap();
        lastTapRef.current = 0; // Reset to prevent triple tap
      } else {
        lastTapRef.current = now;
      }
    } else if (e.touches.length === 2 && onPinch) {
      // Multi-touch gesture (pinch)
      isMultiTouchRef.current = true;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      initialDistanceRef.current = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      // Clear long press timer for multi-touch
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    }
  }, [onDoubleTap, onLongPress, onPinch, longPressDelay]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Clear long press timer on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    if (e.touches.length === 2 && onPinch && isMultiTouchRef.current) {
      // Handle pinch gesture
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (initialDistanceRef.current > 0) {
        const scale = currentDistance / initialDistanceRef.current;
        onPinch(scale);
      }
    }
  }, [onPinch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    if (isMultiTouchRef.current || !touchStartRef.current) {
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchTimeRef.current;

    // Only process swipes that are quick enough (< 300ms) and long enough
    if (deltaTime < 300 && (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > threshold && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < -threshold && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > threshold && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < -threshold && onSwipeUp) {
          onSwipeUp();
        }
      }
    }

    touchStartRef.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

// Swipe gesture wrapper component
export function SwipeGesture({
  children,
  className,
  disabled = false,
  ...gestureProps
}: SwipeGestureProps) {
  const handlers = useSwipeGesture(gestureProps);

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn('touch-pan-y', className)}
      {...handlers}
    >
      {children}
    </div>
  );
}

// Pull to refresh component
export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [canPull, setCanPull] = React.useState(false);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Only allow pull to refresh when scrolled to top
    setCanPull(container.scrollTop === 0);
    touchStartY.current = e.touches[0].clientY;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || !canPull) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    if (deltaY > 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      
      // Apply elastic resistance
      const resistance = Math.max(0, 1 - (deltaY / (threshold * 3)));
      const elasticDistance = deltaY * resistance;
      
      setPullDistance(Math.min(elasticDistance, threshold * 1.5));
    }
  }, [disabled, isRefreshing, canPull, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !canPull) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setCanPull(false);
  }, [disabled, isRefreshing, canPull, pullDistance, threshold, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const showSpinner = isRefreshing || pullProgress >= 1;

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
          style={{
            transform: `translateY(-100%)`,
            opacity: Math.max(0.1, pullProgress),
          }}
        >
          {showSpinner ? (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">
                {isRefreshing ? 'Refreshing...' : 'Release to refresh'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <div 
                className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"
                style={{
                  transform: `rotate(${pullProgress * 180}deg)`,
                }}
              />
              <span className="text-sm">Pull to refresh</span>
            </div>
          )}
        </div>
      )}
      
      {children}
    </div>
  );
}

// Mobile chat keyboard handler
export function useMobileChatKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        const heightDiff = window.innerHeight - visualViewport.height;
        setKeyboardHeight(heightDiff);
        setIsKeyboardOpen(heightDiff > 150); // Threshold for keyboard detection
      }
    };

    const handleFocusIn = () => {
      // Small delay to ensure keyboard is fully open
      setTimeout(handleResize, 100);
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
      }, 100);
    };

    // Listen for visual viewport changes (modern approach)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    // Fallback for older browsers
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    window.addEventListener('resize', handleResize);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardOpen,
  };
}

// Haptic feedback utility
export function useHapticFeedback() {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const lightTap = useCallback(() => vibrate(10), [vibrate]);
  const mediumTap = useCallback(() => vibrate(50), [vibrate]);
  const heavyTap = useCallback(() => vibrate([100, 50, 100]), [vibrate]);
  const error = useCallback(() => vibrate([100, 100, 100]), [vibrate]);
  const success = useCallback(() => vibrate([50, 50, 50, 50, 50]), [vibrate]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    error,
    success,
  };
}

export default SwipeGesture;