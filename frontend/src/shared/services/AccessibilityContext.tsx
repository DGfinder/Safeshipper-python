'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { responsiveA11y, screenReader, a11yUtils } from '@/shared/utils/accessibility';

// Accessibility preferences interface
interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  focusIndicator: 'default' | 'enhanced';
  screenReader: boolean;
  keyboardNavigation: boolean;
  announcements: boolean;
}

// Accessibility context interface
interface AccessibilityContextType {
  preferences: AccessibilityPreferences;
  updatePreferences: (updates: Partial<AccessibilityPreferences>) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  generateId: (prefix?: string) => string;
  isReducedMotion: boolean;
  isHighContrast: boolean;
  colorScheme: 'light' | 'dark';
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

// Default preferences
const defaultPreferences: AccessibilityPreferences = {
  reduceMotion: false,
  highContrast: false,
  colorScheme: 'auto',
  fontSize: 'medium',
  focusIndicator: 'default',
  screenReader: false,
  keyboardNavigation: true,
  announcements: true,
};

// Accessibility provider component
interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('safeshipper-a11y-preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (error) {
        console.error('Error parsing accessibility preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('safeshipper-a11y-preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Setup media query listeners
  useEffect(() => {
    // Reduced motion listener
    const cleanupReducedMotion = responsiveA11y.createMediaQueryListener(
      '(prefers-reduced-motion: reduce)',
      (matches) => {
        setIsReducedMotion(matches);
        if (matches) {
          setPreferences(prev => ({ ...prev, reduceMotion: true }));
        }
      }
    );

    // High contrast listener
    const cleanupHighContrast = responsiveA11y.createMediaQueryListener(
      '(prefers-contrast: high)',
      (matches) => {
        setIsHighContrast(matches);
        if (matches) {
          setPreferences(prev => ({ ...prev, highContrast: true }));
        }
      }
    );

    // Color scheme listener
    const cleanupColorScheme = responsiveA11y.createMediaQueryListener(
      '(prefers-color-scheme: dark)',
      (matches) => {
        if (preferences.colorScheme === 'auto') {
          setColorScheme(matches ? 'dark' : 'light');
        }
      }
    );

    return () => {
      cleanupReducedMotion();
      cleanupHighContrast();
      cleanupColorScheme();
    };
  }, [preferences.colorScheme]);

  // Apply preferences to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply color scheme
    if (preferences.colorScheme === 'auto') {
      root.classList.toggle('dark', colorScheme === 'dark');
    } else {
      root.classList.toggle('dark', preferences.colorScheme === 'dark');
    }

    // Apply font size
    root.classList.remove('text-sm', 'text-base', 'text-lg', 'text-xl');
    const fontSizeMap = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
      xlarge: 'text-xl',
    };
    root.classList.add(fontSizeMap[preferences.fontSize]);

    // Apply reduced motion
    if (preferences.reduceMotion) {
      root.style.setProperty('--animation-duration', '0s');
      root.style.setProperty('--transition-duration', '0s');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }

    // Apply high contrast
    root.classList.toggle('high-contrast', preferences.highContrast);

    // Apply focus indicator
    root.classList.toggle('enhanced-focus', preferences.focusIndicator === 'enhanced');

    // Apply screen reader optimizations
    if (preferences.screenReader) {
      root.setAttribute('data-screen-reader', 'true');
    } else {
      root.removeAttribute('data-screen-reader');
    }

  }, [preferences, colorScheme]);

  // Add keyboard navigation support
  useEffect(() => {
    if (!preferences.keyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Global keyboard shortcuts
      if (e.altKey) {
        switch (e.key) {
          case 'h':
            e.preventDefault();
            // Focus on main heading
            const mainHeading = document.querySelector('h1');
            if (mainHeading) {
              (mainHeading as HTMLElement).focus();
            }
            break;
          case 'm':
            e.preventDefault();
            // Focus on main content
            const mainContent = document.querySelector('main, [role="main"]');
            if (mainContent) {
              (mainContent as HTMLElement).focus();
            }
            break;
          case 'n':
            e.preventDefault();
            // Focus on navigation
            const nav = document.querySelector('nav, [role="navigation"]');
            if (nav) {
              (nav as HTMLElement).focus();
            }
            break;
          case 's':
            e.preventDefault();
            // Focus on search
            const search = document.querySelector('input[type="search"], [role="search"] input');
            if (search) {
              (search as HTMLElement).focus();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [preferences.keyboardNavigation]);

  // Add skip links
  useEffect(() => {
    const skipLinks = document.getElementById('skip-links');
    if (skipLinks) return;

    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.id = 'skip-links';
    skipLinksContainer.innerHTML = `
      <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white">
        Skip to main content
      </a>
      <a href="#main-navigation" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-20 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white">
        Skip to navigation
      </a>
    `;
    
    document.body.insertBefore(skipLinksContainer, document.body.firstChild);

    return () => {
      const existingSkipLinks = document.getElementById('skip-links');
      if (existingSkipLinks) {
        existingSkipLinks.remove();
      }
    };
  }, []);

  const updatePreferences = (updates: Partial<AccessibilityPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
    
    // Announce preference changes
    if (preferences.announcements) {
      const keys = Object.keys(updates);
      if (keys.length === 1) {
        const key = keys[0];
        const value = updates[key as keyof AccessibilityPreferences];
        screenReader.announce(`${key} changed to ${value}`, 'polite');
      } else {
        screenReader.announce('Accessibility preferences updated', 'polite');
      }
    }
  };

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (preferences.announcements) {
      screenReader.announce(message, priority);
    }
  };

  const generateId = (prefix?: string) => {
    return a11yUtils.generateId(prefix);
  };

  const value: AccessibilityContextType = {
    preferences,
    updatePreferences,
    announce,
    generateId,
    isReducedMotion,
    isHighContrast,
    colorScheme: preferences.colorScheme === 'auto' ? colorScheme : preferences.colorScheme,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// Hook to use accessibility context
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// Accessibility settings component
export function AccessibilitySettings() {
  const { preferences, updatePreferences } = useAccessibility();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Accessibility Settings</h2>
        <p className="text-sm text-gray-600 mb-6">
          Customize the interface to meet your accessibility needs.
        </p>
      </div>

      <div className="space-y-4">
        {/* Color Scheme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color Scheme
          </label>
          <select
            value={preferences.colorScheme}
            onChange={(e) => updatePreferences({ colorScheme: e.target.value as 'light' | 'dark' | 'auto' })}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="auto">Auto (System Preference)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Size
          </label>
          <select
            value={preferences.fontSize}
            onChange={(e) => updatePreferences({ fontSize: e.target.value as 'small' | 'medium' | 'large' | 'xlarge' })}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="xlarge">Extra Large</option>
          </select>
        </div>

        {/* Focus Indicator */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Focus Indicator
          </label>
          <select
            value={preferences.focusIndicator}
            onChange={(e) => updatePreferences({ focusIndicator: e.target.value as 'default' | 'enhanced' })}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="default">Default</option>
            <option value="enhanced">Enhanced</option>
          </select>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.reduceMotion}
              onChange={(e) => updatePreferences({ reduceMotion: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm">Reduce motion and animations</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.highContrast}
              onChange={(e) => updatePreferences({ highContrast: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm">High contrast mode</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.keyboardNavigation}
              onChange={(e) => updatePreferences({ keyboardNavigation: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm">Enhanced keyboard navigation</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.announcements}
              onChange={(e) => updatePreferences({ announcements: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm">Screen reader announcements</span>
          </label>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Keyboard Shortcuts</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <div><kbd className="px-2 py-1 bg-blue-100 rounded">Alt + H</kbd> - Focus on main heading</div>
            <div><kbd className="px-2 py-1 bg-blue-100 rounded">Alt + M</kbd> - Focus on main content</div>
            <div><kbd className="px-2 py-1 bg-blue-100 rounded">Alt + N</kbd> - Focus on navigation</div>
            <div><kbd className="px-2 py-1 bg-blue-100 rounded">Alt + S</kbd> - Focus on search</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Accessibility status indicator
export function AccessibilityStatusIndicator() {
  const { preferences, isReducedMotion, isHighContrast } = useAccessibility();

  const activeFeatures = [
    preferences.reduceMotion && 'Reduced Motion',
    preferences.highContrast && 'High Contrast',
    preferences.fontSize !== 'medium' && `Font: ${preferences.fontSize}`,
    preferences.focusIndicator === 'enhanced' && 'Enhanced Focus',
    preferences.screenReader && 'Screen Reader',
  ].filter(Boolean);

  if (activeFeatures.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-blue-900 text-white p-2 rounded-md shadow-lg text-xs">
        <div className="font-medium mb-1">Accessibility Features Active:</div>
        <div className="space-y-1">
          {activeFeatures.map((feature, index) => (
            <div key={index}>• {feature}</div>
          ))}
        </div>
      </div>
    </div>
  );
}