/**
 * Design Token System for SafeShipper
 * 
 * This system provides a comprehensive set of design tokens for consistent
 * theming across the entire application. It supports light/dark modes,
 * accessibility compliance, and logistics-specific color schemes.
 */

// Core color primitives
export const colors = {
  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  
  // Logistics-specific colors
  logistics: {
    // Dangerous goods classifications
    dangerous: {
      explosive: '#ff4444',
      flammable: '#ff8800',
      oxidizer: '#ffcc00',
      toxic: '#44ff44',
      radioactive: '#ff00ff',
      corrosive: '#0088ff',
    },
    
    // Status colors
    status: {
      transit: '#3b82f6',
      delivered: '#10b981',
      delayed: '#f59e0b',
      cancelled: '#ef4444',
      scheduled: '#8b5cf6',
      pending: '#6b7280',
    },
    
    // Fleet colors
    fleet: {
      active: '#10b981',
      maintenance: '#f59e0b',
      offline: '#6b7280',
      emergency: '#ef4444',
    },
  },
  
  // Semantic colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  
  // Neutral colors
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Surface colors
  surface: {
    background: '#ffffff',
    foreground: '#111827',
    card: '#ffffff',
    popover: '#ffffff',
    border: '#e5e7eb',
    input: '#ffffff',
    ring: '#3b82f6',
    accent: '#f3f4f6',
    muted: '#f9fafb',
  },
  
  // Dark mode colors
  dark: {
    surface: {
      background: '#0f172a',
      foreground: '#f8fafc',
      card: '#1e293b',
      popover: '#1e293b',
      border: '#334155',
      input: '#1e293b',
      ring: '#3b82f6',
      accent: '#1e293b',
      muted: '#0f172a',
    },
    
    neutral: {
      50: '#0f172a',
      100: '#1e293b',
      200: '#334155',
      300: '#475569',
      400: '#64748b',
      500: '#94a3b8',
      600: '#cbd5e1',
      700: '#e2e8f0',
      800: '#f1f5f9',
      900: '#f8fafc',
      950: '#ffffff',
    },
  },
};

// Typography tokens
export const typography = {
  fontFamilies: {
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
    display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  },
  
  fontSizes: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
    '7xl': '4.5rem',    // 72px
  },
  
  fontWeights: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  lineHeights: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Spacing tokens
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',    // 2px
  1: '0.25rem',       // 4px
  1.5: '0.375rem',    // 6px
  2: '0.5rem',        // 8px
  2.5: '0.625rem',    // 10px
  3: '0.75rem',       // 12px
  3.5: '0.875rem',    // 14px
  4: '1rem',          // 16px
  5: '1.25rem',       // 20px
  6: '1.5rem',        // 24px
  7: '1.75rem',       // 28px
  8: '2rem',          // 32px
  9: '2.25rem',       // 36px
  10: '2.5rem',       // 40px
  11: '2.75rem',      // 44px
  12: '3rem',         // 48px
  14: '3.5rem',       // 56px
  16: '4rem',         // 64px
  20: '5rem',         // 80px
  24: '6rem',         // 96px
  28: '7rem',         // 112px
  32: '8rem',         // 128px
  36: '9rem',         // 144px
  40: '10rem',        // 160px
  44: '11rem',        // 176px
  48: '12rem',        // 192px
  52: '13rem',        // 208px
  56: '14rem',        // 224px
  60: '15rem',        // 240px
  64: '16rem',        // 256px
  72: '18rem',        // 288px
  80: '20rem',        // 320px
  96: '24rem',        // 384px
};

// Border radius tokens
export const radii = {
  none: '0',
  sm: '0.125rem',     // 2px
  base: '0.25rem',    // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',
};

// Shadow tokens
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
};

// Animation tokens
export const animations = {
  durations: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '750ms',
    slowest: '1000ms',
  },
  
  easings: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  keyframes: {
    spin: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
    ping: {
      '75%, 100%': { transform: 'scale(2)', opacity: '0' },
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' },
    },
    bounce: {
      '0%, 100%': { transform: 'translateY(-25%)', animationTimingFunction: 'cubic-bezier(0.8,0,1,1)' },
      '50%': { transform: 'none', animationTimingFunction: 'cubic-bezier(0,0,0.2,1)' },
    },
  },
};

// Breakpoints
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Z-index tokens
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
  toast: 1070,
  max: 2147483647,
};

// Component-specific tokens
export const components = {
  button: {
    sizes: {
      sm: {
        height: spacing[8],
        padding: `${spacing[1]} ${spacing[3]}`,
        fontSize: typography.fontSizes.sm,
      },
      base: {
        height: spacing[10],
        padding: `${spacing[2]} ${spacing[4]}`,
        fontSize: typography.fontSizes.base,
      },
      lg: {
        height: spacing[12],
        padding: `${spacing[3]} ${spacing[6]}`,
        fontSize: typography.fontSizes.lg,
      },
    },
    
    variants: {
      primary: {
        backgroundColor: colors.primary[600],
        color: colors.neutral[50],
        borderColor: colors.primary[600],
        hover: {
          backgroundColor: colors.primary[700],
          borderColor: colors.primary[700],
        },
        focus: {
          ring: colors.primary[500],
        },
        disabled: {
          backgroundColor: colors.neutral[300],
          color: colors.neutral[500],
          borderColor: colors.neutral[300],
        },
      },
      
      secondary: {
        backgroundColor: colors.neutral[100],
        color: colors.neutral[900],
        borderColor: colors.neutral[300],
        hover: {
          backgroundColor: colors.neutral[200],
          borderColor: colors.neutral[400],
        },
        focus: {
          ring: colors.neutral[500],
        },
        disabled: {
          backgroundColor: colors.neutral[100],
          color: colors.neutral[400],
          borderColor: colors.neutral[200],
        },
      },
      
      outline: {
        backgroundColor: 'transparent',
        color: colors.primary[600],
        borderColor: colors.primary[600],
        hover: {
          backgroundColor: colors.primary[50],
          borderColor: colors.primary[700],
        },
        focus: {
          ring: colors.primary[500],
        },
        disabled: {
          backgroundColor: 'transparent',
          color: colors.neutral[400],
          borderColor: colors.neutral[200],
        },
      },
      
      ghost: {
        backgroundColor: 'transparent',
        color: colors.neutral[600],
        borderColor: 'transparent',
        hover: {
          backgroundColor: colors.neutral[100],
          color: colors.neutral[900],
        },
        focus: {
          ring: colors.neutral[500],
        },
        disabled: {
          backgroundColor: 'transparent',
          color: colors.neutral[400],
          borderColor: 'transparent',
        },
      },
      
      danger: {
        backgroundColor: colors.error[600],
        color: colors.neutral[50],
        borderColor: colors.error[600],
        hover: {
          backgroundColor: colors.error[700],
          borderColor: colors.error[700],
        },
        focus: {
          ring: colors.error[500],
        },
        disabled: {
          backgroundColor: colors.neutral[300],
          color: colors.neutral[500],
          borderColor: colors.neutral[300],
        },
      },
    },
  },
  
  input: {
    sizes: {
      sm: {
        height: spacing[8],
        padding: `${spacing[1]} ${spacing[3]}`,
        fontSize: typography.fontSizes.sm,
      },
      base: {
        height: spacing[10],
        padding: `${spacing[2]} ${spacing[3]}`,
        fontSize: typography.fontSizes.base,
      },
      lg: {
        height: spacing[12],
        padding: `${spacing[3]} ${spacing[4]}`,
        fontSize: typography.fontSizes.lg,
      },
    },
    
    states: {
      default: {
        backgroundColor: colors.surface.input,
        borderColor: colors.surface.border,
        color: colors.surface.foreground,
      },
      focus: {
        borderColor: colors.surface.ring,
        ring: colors.surface.ring,
      },
      error: {
        borderColor: colors.error[500],
        ring: colors.error[500],
      },
      disabled: {
        backgroundColor: colors.neutral[100],
        borderColor: colors.neutral[200],
        color: colors.neutral[500],
      },
    },
  },
  
  card: {
    default: {
      backgroundColor: colors.surface.card,
      borderColor: colors.surface.border,
      borderRadius: radii.lg,
      boxShadow: shadows.sm,
    },
    
    hover: {
      boxShadow: shadows.md,
    },
    
    elevated: {
      boxShadow: shadows.lg,
    },
  },
  
  badge: {
    sizes: {
      sm: {
        padding: `${spacing[1]} ${spacing[2]}`,
        fontSize: typography.fontSizes.xs,
      },
      base: {
        padding: `${spacing[1]} ${spacing[2.5]}`,
        fontSize: typography.fontSizes.sm,
      },
      lg: {
        padding: `${spacing[2]} ${spacing[3]}`,
        fontSize: typography.fontSizes.base,
      },
    },
    
    variants: {
      default: {
        backgroundColor: colors.neutral[100],
        color: colors.neutral[800],
      },
      primary: {
        backgroundColor: colors.primary[100],
        color: colors.primary[800],
      },
      success: {
        backgroundColor: colors.success[100],
        color: colors.success[800],
      },
      warning: {
        backgroundColor: colors.warning[100],
        color: colors.warning[800],
      },
      error: {
        backgroundColor: colors.error[100],
        color: colors.error[800],
      },
      outline: {
        backgroundColor: 'transparent',
        color: colors.neutral[600],
        borderColor: colors.neutral[200],
      },
    },
  },
};

// Theme configuration
export const lightTheme = {
  colors: {
    ...colors,
    surface: colors.surface,
  },
  typography,
  spacing,
  radii,
  shadows,
  animations,
  breakpoints,
  zIndex,
  components,
};

export const darkTheme = {
  colors: {
    ...colors,
    surface: colors.dark.surface,
    neutral: colors.dark.neutral,
  },
  typography,
  spacing,
  radii,
  shadows: {
    ...shadows,
    // Enhanced shadows for dark mode
    md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.4)',
  },
  animations,
  breakpoints,
  zIndex,
  components: {
    ...components,
    // Dark mode component adjustments
    button: {
      ...components.button,
      variants: {
        ...components.button.variants,
        secondary: {
          ...components.button.variants.secondary,
          backgroundColor: colors.dark.surface.card,
          color: colors.dark.surface.foreground,
          borderColor: colors.dark.surface.border,
        },
      },
    },
  },
};

// Export default theme
export const theme = lightTheme;
export type Theme = typeof lightTheme;

// Utility functions
export function getColorValue(path: string, theme: Theme = lightTheme): string {
  const keys = path.split('.');
  let value: any = theme.colors;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) break;
  }
  
  return value || path;
}

export function getSpacingValue(size: keyof typeof spacing): string {
  return spacing[size];
}

export function getTypographyValue(
  category: keyof typeof typography,
  size: string
): string {
  return (typography[category] as any)[size] || size;
}

// CSS custom properties generator
export function generateCSSCustomProperties(theme: Theme): string {
  const properties: string[] = [];
  
  // Colors
  Object.entries(theme.colors).forEach(([category, values]) => {
    if (typeof values === 'object' && !Array.isArray(values)) {
      Object.entries(values).forEach(([shade, value]) => {
        properties.push(`--color-${category}-${shade}: ${value};`);
      });
    }
  });
  
  // Typography
  Object.entries(theme.typography.fontSizes).forEach(([size, value]) => {
    properties.push(`--font-size-${size}: ${value};`);
  });
  
  // Spacing
  Object.entries(theme.spacing).forEach(([size, value]) => {
    properties.push(`--spacing-${size}: ${value};`);
  });
  
  // Shadows
  Object.entries(theme.shadows).forEach(([size, value]) => {
    properties.push(`--shadow-${size}: ${value};`);
  });
  
  // Border radius
  Object.entries(theme.radii).forEach(([size, value]) => {
    properties.push(`--radius-${size}: ${value};`);
  });
  
  return `:root {\n  ${properties.join('\n  ')}\n}`;
}