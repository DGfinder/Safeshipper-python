// demo-indicator.tsx
// Visual indicators to show Terry what's demo vs. real data

"use client";

import React from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { 
  Activity, 
  Database, 
  Wifi, 
  WifiOff, 
  Play, 
  Settings,
  Eye
} from 'lucide-react';
import { shouldShowDemoIndicators, isDemoMode, isTerryMode } from '@/shared/config/environment';

interface DemoIndicatorProps {
  type?: 'demo' | 'live' | 'hybrid';
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DemoIndicator: React.FC<DemoIndicatorProps> = ({ 
  type = 'demo', 
  label,
  className = '',
  size = 'sm'
}) => {
  if (!shouldShowDemoIndicators()) return null;

  const getIndicatorConfig = () => {
    switch (type) {
      case 'live':
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: label || 'Live Data',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'hybrid':
        return {
          icon: <Activity className="h-3 w-3" />,
          text: label || 'Hybrid Mode',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      default:
        return {
          icon: <Database className="h-3 w-3" />,
          text: label || 'Demo Data',
          className: 'bg-purple-100 text-purple-800 border-purple-200'
        };
    }
  };

  const config = getIndicatorConfig();
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5', 
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses[size]} ${className} flex items-center gap-1`}
    >
      {config.icon}
      {config.text}
    </Badge>
  );
};

interface ApiStatusIndicatorProps {
  isConnected: boolean;
  lastUpdate?: string;
  className?: string;
}

export const ApiStatusIndicator: React.FC<ApiStatusIndicatorProps> = ({ 
  isConnected, 
  lastUpdate,
  className = ''
}) => {
  if (!shouldShowDemoIndicators()) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}
        <span className="text-sm text-gray-600">
          {isConnected ? 'API Connected' : 'Demo Mode'}
        </span>
      </div>
      {lastUpdate && (
        <span className="text-xs text-gray-500">
          Updated: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

interface TerryDemoControlsProps {
  onToggleMode?: () => void;
  onTriggerScenario?: (scenario: string) => void;
}

export const TerryDemoControls: React.FC<TerryDemoControlsProps> = ({
  onToggleMode,
  onTriggerScenario
}) => {
  if (!isTerryMode()) return null;

  const scenarios = [
    { id: 'compliance-violation', label: 'Compliance Alert', icon: '⚠️' },
    { id: 'emergency-response', label: 'Emergency Response', icon: '🚨' },
    { id: 'api-switch', label: 'Switch API Mode', icon: '🔄' },
    { id: 'customer-showcase', label: 'Customer Deep Dive', icon: '👥' }
  ];

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-900">Terry's Demo Controls</span>
      </div>
      
      <div className="space-y-2">
        {scenarios.map((scenario) => (
          <Button
            key={scenario.id}
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => onTriggerScenario?.(scenario.id)}
          >
            <span className="mr-2">{scenario.icon}</span>
            {scenario.label}
          </Button>
        ))}
      </div>
      
      <div className="border-t pt-3 mt-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={onToggleMode}
        >
          <Settings className="h-4 w-4 mr-2" />
          Toggle Demo Mode
        </Button>
      </div>
    </div>
  );
};

interface DemoDataBadgeProps {
  children: React.ReactNode;
  type?: 'simulated' | 'realtime' | 'aggregated';
  className?: string;
}

export const DemoDataBadge: React.FC<DemoDataBadgeProps> = ({ 
  children, 
  type = 'simulated',
  className = ''
}) => {
  if (!shouldShowDemoIndicators()) return <>{children}</>;

  const badgeConfig = {
    simulated: { color: 'purple', label: 'Simulated' },
    realtime: { color: 'green', label: 'Real-time' },
    aggregated: { color: 'blue', label: 'Calculated' }
  };

  const config = badgeConfig[type];

  return (
    <div className={`relative ${className}`}>
      {children}
      <Badge 
        variant="outline" 
        className={`absolute -top-2 -right-2 text-xs bg-${config.color}-100 text-${config.color}-800 border-${config.color}-200`}
      >
        {config.label}
      </Badge>
    </div>
  );
};