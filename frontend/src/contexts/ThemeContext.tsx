'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { lightTheme, darkTheme, type Theme } from '@/styles/design-tokens';

// Theme mode type
export type ThemeMode = 'light' | 'dark' | 'system';

// Theme context type
interface ThemeContextType {
  mode: ThemeMode;
  theme: Theme;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  systemPreference: 'light' | 'dark';
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider props
interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

// Theme provider component
export function ThemeProvider({ 
  children, 
  defaultMode = 'system',
  storageKey = 'safeshipper-theme-mode'
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Get system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load saved theme from storage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(storageKey);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
    setMounted(true);
  }, [storageKey]);

  // Save theme to storage
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(storageKey, newMode);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  };

  // Toggle between light and dark (skips system)
  const toggleTheme = () => {
    if (mode === 'light') {
      setMode('dark');
    } else if (mode === 'dark') {
      setMode('light');
    } else {
      // If system, toggle to opposite of current system preference
      setMode(systemPreference === 'light' ? 'dark' : 'light');
    }
  };

  // Determine current theme
  const isDark = mode === 'dark' || (mode === 'system' && systemPreference === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add current theme class
    root.classList.add(isDark ? 'dark' : 'light');
    
    // Update color-scheme for better OS integration
    root.style.colorScheme = isDark ? 'dark' : 'light';
    
    // Generate and apply CSS custom properties
    const customProperties = generateCSSCustomProperties(theme);
    
    // Remove existing custom properties style
    const existingStyle = document.getElementById('theme-custom-properties');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Add new custom properties style
    const styleElement = document.createElement('style');
    styleElement.id = 'theme-custom-properties';
    styleElement.textContent = customProperties;
    document.head.appendChild(styleElement);
    
    // Update meta theme-color for mobile browsers
    updateMetaThemeColor(isDark);
    
  }, [theme, isDark, mounted]);

  // Don't render until mounted to prevent hydration mismatches
  if (!mounted) {
    // During SSR/SSG, provide context with safe defaults
    const ssrContextValue: ThemeContextType = {
      mode: 'light',
      theme: lightTheme,
      isDark: false,
      setMode: () => {},
      toggleTheme: () => {},
      systemPreference: 'light',
    };
    
    return (
      <ThemeContext.Provider value={ssrContextValue}>
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </ThemeContext.Provider>
    );
  }

  const contextValue: ThemeContextType = {
    mode,
    theme,
    isDark,
    setMode,
    toggleTheme,
    systemPreference,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // During SSR/SSG, provide safe fallback values
    if (typeof window === 'undefined') {
      return {
        mode: 'light',
        theme: lightTheme,
        isDark: false,
        setMode: () => {},
        toggleTheme: () => {},
        systemPreference: 'light',
      };
    }
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Utility functions
function generateCSSCustomProperties(theme: Theme): string {
  const properties: string[] = [];
  
  // Surface colors
  Object.entries(theme.colors.surface).forEach(([key, value]) => {
    properties.push(`--surface-${key}: ${value};`);
  });
  
  // Primary colors
  Object.entries(theme.colors.primary).forEach(([key, value]) => {
    properties.push(`--primary-${key}: ${value};`);
  });
  
  // Neutral colors
  Object.entries(theme.colors.neutral).forEach(([key, value]) => {
    properties.push(`--neutral-${key}: ${value};`);
  });
  
  // Success colors
  Object.entries(theme.colors.success).forEach(([key, value]) => {
    properties.push(`--success-${key}: ${value};`);
  });
  
  // Warning colors
  Object.entries(theme.colors.warning).forEach(([key, value]) => {
    properties.push(`--warning-${key}: ${value};`);
  });
  
  // Error colors
  Object.entries(theme.colors.error).forEach(([key, value]) => {
    properties.push(`--error-${key}: ${value};`);
  });
  
  // Info colors
  Object.entries(theme.colors.info).forEach(([key, value]) => {
    properties.push(`--info-${key}: ${value};`);
  });
  
  // Logistics colors
  Object.entries(theme.colors.logistics.status).forEach(([key, value]) => {
    properties.push(`--status-${key}: ${value};`);
  });
  
  Object.entries(theme.colors.logistics.fleet).forEach(([key, value]) => {
    properties.push(`--fleet-${key}: ${value};`);
  });
  
  Object.entries(theme.colors.logistics.dangerous).forEach(([key, value]) => {
    properties.push(`--dangerous-${key}: ${value};`);
  });
  
  // Typography
  Object.entries(theme.typography.fontSizes).forEach(([key, value]) => {
    properties.push(`--font-size-${key}: ${value};`);
  });
  
  Object.entries(theme.typography.fontWeights).forEach(([key, value]) => {
    properties.push(`--font-weight-${key}: ${value};`);
  });
  
  Object.entries(theme.typography.lineHeights).forEach(([key, value]) => {
    properties.push(`--line-height-${key}: ${value};`);
  });
  
  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    properties.push(`--spacing-${key}: ${value};`);
  });
  
  // Border radius
  Object.entries(theme.radii).forEach(([key, value]) => {
    properties.push(`--radius-${key}: ${value};`);
  });
  
  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    properties.push(`--shadow-${key}: ${value};`);
  });
  
  // Animations
  Object.entries(theme.animations.durations).forEach(([key, value]) => {
    properties.push(`--duration-${key}: ${value};`);
  });
  
  Object.entries(theme.animations.easings).forEach(([key, value]) => {
    properties.push(`--easing-${key}: ${value};`);
  });
  
  // Z-index
  Object.entries(theme.zIndex).forEach(([key, value]) => {
    properties.push(`--z-${key}: ${value};`);
  });
  
  return `:root {\n  ${properties.join('\n  ')}\n}`;
}

function updateMetaThemeColor(isDark: boolean) {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#ffffff');
  }
}

// Theme utilities for components
export const themeUtils = {
  // Get theme-aware color
  getColor: (path: string, theme: Theme): string => {
    const keys = path.split('.');
    let value: any = theme.colors;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    
    return value || path;
  },
  
  // Get responsive spacing
  getSpacing: (size: keyof typeof lightTheme.spacing): string => {
    return lightTheme.spacing[size];
  },
  
  // Get typography value
  getTypography: (category: keyof typeof lightTheme.typography, size: string): string => {
    return (lightTheme.typography[category] as any)[size] || size;
  },
  
  // Check if current theme is dark
  isDarkTheme: (theme: Theme): boolean => {
    return theme.colors.surface.background === darkTheme.colors.surface.background;
  },
  
  // Get contrast color
  getContrastColor: (backgroundColor: string, theme: Theme): string => {
    // Simple contrast calculation (could be enhanced)
    const isDarkBg = backgroundColor.includes('800') || backgroundColor.includes('900') || backgroundColor.includes('950');
    return isDarkBg ? theme.colors.neutral[50] : theme.colors.neutral[900];
  },
  
  // Get status color
  getStatusColor: (status: string, theme: Theme): string => {
    const statusColors = theme.colors.logistics.status;
    return (statusColors as any)[status] || theme.colors.neutral[500];
  },
  
  // Get fleet color
  getFleetColor: (status: string, theme: Theme): string => {
    const fleetColors = theme.colors.logistics.fleet;
    return (fleetColors as any)[status] || theme.colors.neutral[500];
  },
  
  // Get dangerous goods color
  getDangerousGoodsColor: (classification: string, theme: Theme): string => {
    const dangerousColors = theme.colors.logistics.dangerous;
    return (dangerousColors as any)[classification] || theme.colors.warning[500];
  },
};

// CSS-in-JS helpers
export const css = {
  // Create theme-aware styles
  themed: (styles: (theme: Theme) => any) => styles,
  
  // Media queries
  media: {
    xs: `@media (min-width: ${lightTheme.breakpoints.xs})`,
    sm: `@media (min-width: ${lightTheme.breakpoints.sm})`,
    md: `@media (min-width: ${lightTheme.breakpoints.md})`,
    lg: `@media (min-width: ${lightTheme.breakpoints.lg})`,
    xl: `@media (min-width: ${lightTheme.breakpoints.xl})`,
    '2xl': `@media (min-width: ${lightTheme.breakpoints['2xl']})`,
    dark: '@media (prefers-color-scheme: dark)',
    light: '@media (prefers-color-scheme: light)',
    reducedMotion: '@media (prefers-reduced-motion: reduce)',
    highContrast: '@media (prefers-contrast: high)',
  },
  
  // Animation utilities
  animation: {
    spin: `spin ${lightTheme.animations.durations.slowest} ${lightTheme.animations.easings.linear} infinite`,
    ping: `ping ${lightTheme.animations.durations.slowest} ${lightTheme.animations.easings.linear} infinite`,
    pulse: `pulse ${lightTheme.animations.durations.slower} ${lightTheme.animations.easings.linear} infinite`,
    bounce: `bounce ${lightTheme.animations.durations.slowest} ${lightTheme.animations.easings.linear} infinite`,
  },
  
  // Layout utilities
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  absoluteCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  
  // Accessibility utilities
  visuallyHidden: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
  },
  
  focusRing: (theme: Theme) => ({
    outline: 'none',
    ring: `2px solid ${theme.colors.surface.ring}`,
    ringOffset: '2px',
  }),
};