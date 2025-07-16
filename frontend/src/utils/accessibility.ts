// Accessibility utilities for WCAG 2.1 AA compliance
import React from 'react';

// Color contrast utilities
export const colorContrast = {
  // Calculate relative luminance (WCAG formula)
  getRelativeLuminance: (color: string): number => {
    const rgb = colorContrast.hexToRgb(color);
    if (!rgb) return 0;

    const getRGBValue = (value: number) => {
      const normalized = value / 255;
      return normalized <= 0.03928 
        ? normalized / 12.92 
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };

    const r = getRGBValue(rgb.r);
    const g = getRGBValue(rgb.g);
    const b = getRGBValue(rgb.b);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  // Convert hex to RGB
  hexToRgb: (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  // Calculate contrast ratio
  getContrastRatio: (color1: string, color2: string): number => {
    const lum1 = colorContrast.getRelativeLuminance(color1);
    const lum2 = colorContrast.getRelativeLuminance(color2);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  },

  // Check if contrast meets WCAG AA standards
  meetsWCAGAA: (foreground: string, background: string, isLargeText: boolean = false): boolean => {
    const ratio = colorContrast.getContrastRatio(foreground, background);
    return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
  },

  // Check if contrast meets WCAG AAA standards
  meetsWCAGAAA: (foreground: string, background: string, isLargeText: boolean = false): boolean => {
    const ratio = colorContrast.getContrastRatio(foreground, background);
    return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
  },

  // Get accessible color recommendations
  getAccessibleColor: (backgroundColor: string, preferredColor: string): string => {
    if (colorContrast.meetsWCAGAA(preferredColor, backgroundColor)) {
      return preferredColor;
    }

    // Try darkening or lightening the preferred color
    const rgb = colorContrast.hexToRgb(preferredColor);
    if (!rgb) return '#000000';

    // Try darker first
    for (let i = 0.1; i <= 0.9; i += 0.1) {
      const darkerColor = colorContrast.rgbToHex(
        Math.floor(rgb.r * i),
        Math.floor(rgb.g * i),
        Math.floor(rgb.b * i)
      );
      if (colorContrast.meetsWCAGAA(darkerColor, backgroundColor)) {
        return darkerColor;
      }
    }

    // Try lighter
    for (let i = 1.1; i <= 2.0; i += 0.1) {
      const lighterColor = colorContrast.rgbToHex(
        Math.min(255, Math.floor(rgb.r * i)),
        Math.min(255, Math.floor(rgb.g * i)),
        Math.min(255, Math.floor(rgb.b * i))
      );
      if (colorContrast.meetsWCAGAA(lighterColor, backgroundColor)) {
        return lighterColor;
      }
    }

    // Fallback to black or white
    return colorContrast.meetsWCAGAA('#000000', backgroundColor) ? '#000000' : '#ffffff';
  },

  // Convert RGB to hex
  rgbToHex: (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },
};

// Focus management utilities
export const focusManagement = {
  // Create focus trap
  createFocusTrap: (container: HTMLElement) => {
    const focusableElements = focusManagement.getFocusableElements(container);
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },

  // Get all focusable elements
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(', ')))
      .filter(el => {
        const element = el as HTMLElement;
        return !(element as any).disabled && 
               !element.hidden && 
               element.offsetParent !== null &&
               element.tabIndex !== -1;
      }) as HTMLElement[];
  },

  // Manage focus restoration
  createFocusRestoration: (triggerElement?: HTMLElement) => {
    const previousFocus = document.activeElement as HTMLElement;
    
    return () => {
      if (triggerElement) {
        triggerElement.focus();
      } else if (previousFocus) {
        previousFocus.focus();
      }
    };
  },

  // Skip link functionality
  createSkipLink: (targetId: string, label: string = 'Skip to main content') => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = label;
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white';
    
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });

    return skipLink;
  },
};

// Screen reader utilities
export const screenReader = {
  // Announce to screen readers
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Create screen reader only text
  createSROnlyText: (text: string): HTMLElement => {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = text;
    return element;
  },

  // Enhanced label support
  createAriaLabel: (element: HTMLElement, label: string) => {
    element.setAttribute('aria-label', label);
  },

  // Create describedby relationship
  createAriaDescribedBy: (element: HTMLElement, descriptionId: string) => {
    const existing = element.getAttribute('aria-describedby');
    const newValue = existing ? `${existing} ${descriptionId}` : descriptionId;
    element.setAttribute('aria-describedby', newValue);
  },
};

// Form accessibility utilities
export const formAccessibility = {
  // Validate form accessibility
  validateForm: (form: HTMLFormElement): string[] => {
    const errors: string[] = [];
    
    // Check for labels
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const element = input as HTMLFormElement;
      const id = element.id;
      const label = form.querySelector(`label[for="${id}"]`);
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledby = element.getAttribute('aria-labelledby');
      
      if (!label && !ariaLabel && !ariaLabelledby) {
        errors.push(`Input ${id || 'unnamed'} has no accessible label`);
      }
    });

    // Check for error messages
    const errorMessages = form.querySelectorAll('[role="alert"], .error-message');
    errorMessages.forEach(error => {
      const element = error as HTMLElement;
      if (!element.id) {
        errors.push('Error message has no ID for aria-describedby reference');
      }
    });

    return errors;
  },

  // Create accessible error message
  createErrorMessage: (inputId: string, message: string): HTMLElement => {
    const errorElement = document.createElement('div');
    errorElement.id = `${inputId}-error`;
    errorElement.className = 'text-sm text-red-600 mt-1';
    errorElement.setAttribute('role', 'alert');
    errorElement.setAttribute('aria-live', 'polite');
    errorElement.textContent = message;
    
    return errorElement;
  },

  // Enhanced fieldset creation
  createFieldset: (legend: string, className?: string): HTMLFieldSetElement => {
    const fieldset = document.createElement('fieldset');
    const legendElement = document.createElement('legend');
    legendElement.textContent = legend;
    fieldset.appendChild(legendElement);
    
    if (className) {
      fieldset.className = className;
    }
    
    return fieldset;
  },
};

// Keyboard navigation utilities
export const keyboardNavigation = {
  // Arrow key navigation for lists
  createArrowKeyNavigation: (container: HTMLElement, itemSelector: string) => {
    const items = Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];
    let currentIndex = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          currentIndex = (currentIndex + 1) % items.length;
          items[currentIndex].focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          currentIndex = (currentIndex - 1 + items.length) % items.length;
          items[currentIndex].focus();
          break;
        case 'Home':
          e.preventDefault();
          currentIndex = 0;
          items[currentIndex].focus();
          break;
        case 'End':
          e.preventDefault();
          currentIndex = items.length - 1;
          items[currentIndex].focus();
          break;
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.setAttribute('role', 'listbox');
    items.forEach((item, index) => {
      item.setAttribute('role', 'option');
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },

  // Escape key handler
  createEscapeKeyHandler: (callback: () => void) => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  },
};

// Responsive design and motion utilities
export const responsiveA11y = {
  // Check for reduced motion preference
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Respect color scheme preference
  prefersColorScheme: (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  // High contrast mode detection
  prefersHighContrast: (): boolean => {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },

  // Create media query listeners
  createMediaQueryListener: (query: string, callback: (matches: boolean) => void) => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => callback(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    callback(mediaQuery.matches); // Initial call
    
    return () => mediaQuery.removeEventListener('change', handler);
  },
};

// Accessibility testing utilities
export const a11yTesting = {
  // Run basic accessibility audit
  auditElement: (element: HTMLElement): string[] => {
    const issues: string[] = [];
    
    // Check for alt text on images
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt && img.alt !== '') {
        issues.push(`Image missing alt text: ${img.src}`);
      }
    });

    // Check for heading hierarchy
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1) {
        issues.push(`Heading level skipped: ${heading.tagName} after h${lastLevel}`);
      }
      lastLevel = level;
    });

    // Check for form labels
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const formElement = input as HTMLFormElement;
      const id = formElement.id;
      const label = element.querySelector(`label[for="${id}"]`);
      if (!label && !formElement.getAttribute('aria-label')) {
        issues.push(`Form control missing label: ${id || 'unnamed'}`);
      }
    });

    return issues;
  },

  // Check color contrast
  auditColorContrast: (element: HTMLElement): string[] => {
    const issues: string[] = [];
    const computedStyle = window.getComputedStyle(element);
    const backgroundColor = computedStyle.backgroundColor;
    const color = computedStyle.color;
    
    if (backgroundColor !== 'rgba(0, 0, 0, 0)' && color !== 'rgba(0, 0, 0, 0)') {
      const ratio = colorContrast.getContrastRatio(color, backgroundColor);
      if (ratio < 4.5) {
        issues.push(`Low color contrast: ${ratio.toFixed(2)} (minimum 4.5)`);
      }
    }
    
    return issues;
  },
};

// React hooks for accessibility
export const useA11y = {
  // Announce changes to screen readers
  useAnnouncement: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    React.useEffect(() => {
      if (message) {
        screenReader.announce(message, priority);
      }
    }, [message, priority]);
  },

  // Focus management hook
  useFocusManagement: (isOpen: boolean, containerRef: React.RefObject<HTMLElement>) => {
    React.useEffect(() => {
      if (isOpen && containerRef.current) {
        const cleanup = focusManagement.createFocusTrap(containerRef.current);
        return cleanup;
      }
    }, [isOpen, containerRef]);
  },

  // Keyboard navigation hook
  useKeyboardNavigation: (containerRef: React.RefObject<HTMLElement>, itemSelector: string) => {
    React.useEffect(() => {
      if (containerRef.current) {
        const cleanup = keyboardNavigation.createArrowKeyNavigation(containerRef.current, itemSelector);
        return cleanup;
      }
    }, [containerRef, itemSelector]);
  },

  // Escape key handler hook
  useEscapeKey: (callback: () => void, enabled: boolean = true) => {
    React.useEffect(() => {
      if (enabled) {
        const cleanup = keyboardNavigation.createEscapeKeyHandler(callback);
        return cleanup;
      }
    }, [callback, enabled]);
  },

  // Media query hook
  useMediaQuery: (query: string) => {
    const [matches, setMatches] = React.useState(false);
    
    React.useEffect(() => {
      const cleanup = responsiveA11y.createMediaQueryListener(query, setMatches);
      return cleanup;
    }, [query]);
    
    return matches;
  },
};

// Utility functions for common patterns
export const a11yUtils = {
  // Generate unique ID for accessibility
  generateId: (prefix: string = 'a11y'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Create live region
  createLiveRegion: (priority: 'polite' | 'assertive' = 'polite'): HTMLElement => {
    const region = document.createElement('div');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    return region;
  },

  // Format accessible date
  formatAccessibleDate: (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Format accessible time
  formatAccessibleTime: (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  },
};