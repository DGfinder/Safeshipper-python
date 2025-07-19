'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSettingsStore, TIMEZONE_GROUPS_EXPORT as TIMEZONE_GROUPS, settingsUtils } from '@/shared/stores/settings-store';
import { useAuthStore } from '@/shared/stores/auth-store';
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  Globe,
  Zap,
  Clock,
  MapPin,
  Thermometer,
  X,
  Check,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface QuickSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'right' | 'left' | 'center';
}

export function QuickSettingsPanel({ 
  isOpen, 
  onClose, 
  position = 'right' 
}: QuickSettingsPanelProps) {
  const [savedNotification, setSavedNotification] = useState(false);
  
  const {
    notifications,
    system,
    updateNotifications,
    updateSystem,
  } = useSettingsStore();

  const { user } = useAuthStore();

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2000);
  };

  const positionClasses = {
    right: 'right-4',
    left: 'left-4',
    center: 'left-1/2 transform -translate-x-1/2',
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={cn(
        "fixed top-4 w-96 max-h-[90vh] overflow-y-auto",
        positionClasses[position]
      )}>
        <Card className="shadow-2xl border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg">Quick Settings</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {savedNotification && (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                    <Check className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Quickly adjust your most-used preferences
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Theme Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Theme
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={system.theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSystem({ theme: 'light' })}
                  className="flex items-center gap-2"
                >
                  <Sun className="h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={system.theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSystem({ theme: 'dark' })}
                  className="flex items-center gap-2"
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={system.theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSystem({ theme: 'system' })}
                  className="flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  Auto
                </Button>
              </div>
            </div>

            {/* Notification Quick Toggles */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Email</span>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      updateNotifications({ emailNotifications: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Push</span>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) =>
                      updateNotifications({ pushNotifications: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {notifications.sound.enabled ? (
                      <Volume2 className="h-4 w-4 text-gray-500" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm">Sound</span>
                  </div>
                  <Switch
                    checked={notifications.sound.enabled}
                    onCheckedChange={(checked) =>
                      updateNotifications({
                        sound: { ...notifications.sound, enabled: checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Quiet Hours</span>
                    <Badge variant="outline" className="text-xs">
                      {notifications.quietHours.start} - {notifications.quietHours.end}
                    </Badge>
                  </div>
                  <Switch
                    checked={notifications.quietHours.enabled}
                    onCheckedChange={(checked) =>
                      updateNotifications({
                        quietHours: { ...notifications.quietHours, enabled: checked }
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Critical Alerts for Transport Operations */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-orange-500" />
                Operational Alerts
              </Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Weather Warnings</span>
                    <Badge variant="outline" className="text-xs text-orange-600">
                      Critical
                    </Badge>
                  </div>
                  <Switch
                    checked={notifications.categories.weatherWarnings}
                    onCheckedChange={(checked) =>
                      updateNotifications({
                        categories: {
                          ...notifications.categories,
                          weatherWarnings: checked,
                        }
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Route Updates</span>
                  </div>
                  <Switch
                    checked={notifications.categories.routeUpdates}
                    onCheckedChange={(checked) =>
                      updateNotifications({
                        categories: {
                          ...notifications.categories,
                          routeUpdates: checked,
                        }
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Emergency Alerts</span>
                    <Badge variant="outline" className="text-xs text-red-600">
                      Critical
                    </Badge>
                  </div>
                  <Switch
                    checked={notifications.categories.emergencyAlerts}
                    onCheckedChange={(checked) =>
                      updateNotifications({
                        categories: {
                          ...notifications.categories,
                          emergencyAlerts: checked,
                        }
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Dashboard Preferences */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Dashboard
              </Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Auto Refresh</span>
                    <Badge variant="outline" className="text-xs">
                      {system.refreshInterval}s
                    </Badge>
                  </div>
                  <Switch
                    checked={system.autoRefresh}
                    onCheckedChange={(checked) =>
                      updateSystem({ autoRefresh: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {system.dashboard.compactMode ? (
                      <Minimize2 className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Maximize2 className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm">Compact Mode</span>
                  </div>
                  <Switch
                    checked={system.dashboard.compactMode}
                    onCheckedChange={(checked) =>
                      updateSystem({
                        dashboard: { ...system.dashboard, compactMode: checked }
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {system.dashboard.showTips ? (
                      <Eye className="h-4 w-4 text-gray-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm">Show Tips</span>
                  </div>
                  <Switch
                    checked={system.dashboard.showTips}
                    onCheckedChange={(checked) =>
                      updateSystem({
                        dashboard: { ...system.dashboard, showTips: checked }
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Quick Timezone note for drivers */}
            {user?.role === 'DRIVER' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Timezone Settings
                </Label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    Timezone settings can be changed in your Profile settings. 
                    Current timezone will be auto-detected from your location.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleSave}
                className="flex-1 flex items-center gap-2"
                size="sm"
              >
                <Check className="h-4 w-4" />
                Apply Changes
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="flex items-center gap-2"
                size="sm"
              >
                <Settings className="h-4 w-4" />
                Full Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Quick Settings Trigger Button
interface QuickSettingsTriggerProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export function QuickSettingsTrigger({ 
  className, 
  variant = 'ghost' 
}: QuickSettingsTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn("flex items-center gap-2", className)}
        title="Quick Settings (Ctrl+,)"
      >
        <Zap className="h-4 w-4" />
        <span className="hidden md:inline">Quick Settings</span>
      </Button>
      
      <QuickSettingsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

// Hook for keyboard shortcut
export function useQuickSettingsShortcut() {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    setIsOpen,
    QuickSettingsPanel: () => (
      <QuickSettingsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    ),
  };
}