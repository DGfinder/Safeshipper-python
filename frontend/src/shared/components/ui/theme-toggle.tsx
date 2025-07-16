'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Settings,
  Check,
  Contrast,
  Type,
  Zap,
  Eye,
  Accessibility,
} from 'lucide-react';

// Theme toggle button component
export function ThemeToggle() {
  const { mode, isDark, setMode, toggleTheme, systemPreference } = useTheme();
  const { preferences } = useAccessibility();

  const getCurrentIcon = () => {
    if (mode === 'system') {
      return systemPreference === 'dark' ? Moon : Sun;
    }
    return isDark ? Moon : Sun;
  };

  const Icon = getCurrentIcon();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
          aria-label="Toggle theme"
        >
          <Icon className="h-4 w-4" />
          {mode === 'system' && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
            >
              A
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          Theme
        </div>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => setMode('light')}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            mode === 'light' && 'bg-blue-50 dark:bg-blue-900/20'
          )}
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {mode === 'light' && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setMode('dark')}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            mode === 'dark' && 'bg-blue-50 dark:bg-blue-900/20'
          )}
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {mode === 'dark' && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setMode('system')}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            mode === 'system' && 'bg-blue-50 dark:bg-blue-900/20'
          )}
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {mode === 'system' && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        
        {preferences.announcements && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Accessibility className="h-3 w-3" />
                Accessibility Enhanced
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Quick theme toggle (just toggles between light/dark)
export function QuickThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="relative"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

// Theme customization panel
export function ThemeCustomizationPanel() {
  const { mode, theme, isDark, setMode } = useTheme();
  const { preferences, updatePreferences } = useAccessibility();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ComponentType<any>; description: string }[] = [
    {
      mode: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Clean, bright interface optimized for daylight use',
    },
    {
      mode: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Reduced eye strain for low-light environments',
    },
    {
      mode: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Automatically adapts to your device settings',
    },
  ];

  const contrastOptions = [
    { value: 'normal', label: 'Normal', description: 'Standard contrast ratios' },
    { value: 'high', label: 'High', description: 'Enhanced contrast for better readability' },
    { value: 'max', label: 'Maximum', description: 'Maximum contrast for accessibility' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small', description: 'Compact text for more content' },
    { value: 'normal', label: 'Normal', description: 'Standard text size' },
    { value: 'large', label: 'Large', description: 'Larger text for better readability' },
  ];

  return (
    <div className="space-y-6 p-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Theme Customization</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Settings className="h-4 w-4 mr-2" />
          {showAdvanced ? 'Simple' : 'Advanced'}
        </Button>
      </div>

      {/* Theme Mode Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium">Appearance</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = mode === option.mode;
            
            return (
              <button
                key={option.mode}
                onClick={() => setMode(option.mode)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600'
                )}
              >
                <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>
                {isSelected && <Check className="h-5 w-5 text-blue-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <>
          {/* Contrast Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Contrast className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium">Contrast</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {contrastOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updatePreferences({ highContrast: option.value === 'high' })}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border text-left transition-all',
                    (preferences.highContrast && option.value === 'high') || (!preferences.highContrast && option.value === 'normal')
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600'
                  )}
                >
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description}
                    </div>
                  </div>
                  {((preferences.highContrast && option.value === 'high') || (!preferences.highContrast && option.value === 'normal')) && (
                    <Check className="h-4 w-4 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium">Font Size</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {fontSizeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updatePreferences({ fontSize: option.value as any })}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border text-left transition-all',
                    preferences.fontSize === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600'
                  )}
                >
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description}
                    </div>
                  </div>
                  {preferences.fontSize === option.value && (
                    <Check className="h-4 w-4 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Animation Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium">Animations</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => updatePreferences({ reduceMotion: !preferences.reduceMotion })}
                className={cn(
                  'flex items-center justify-between w-full p-3 rounded-lg border text-left transition-all',
                  preferences.reduceMotion
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600'
                )}
              >
                <div>
                  <div className="font-medium">Reduced Motion</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Minimize animations for better accessibility
                  </div>
                </div>
                {preferences.reduceMotion && (
                  <Check className="h-4 w-4 text-blue-500" />
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Theme Preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium">Preview</h3>
        </div>
        <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500"></div>
              <div>
                <div className="font-medium">SafeShipper Dashboard</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current theme: {isDark ? 'Dark' : 'Light'} mode
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="outline">Secondary</Button>
              <Button size="sm" variant="ghost">Ghost</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge>Active</Badge>
              <Badge variant="secondary">Pending</Badge>
              <Badge className="bg-green-100 text-green-800">Success</Badge>
              <Badge className="bg-red-100 text-red-800">Error</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}