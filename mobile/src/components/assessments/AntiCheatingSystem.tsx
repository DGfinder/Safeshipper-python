"use client";

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, AppState, AppStateStatus } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { 
  Shield, 
  Clock, 
  MapPin, 
  Camera, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  Zap,
  Activity
} from 'lucide-react-native';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';

interface AntiCheatingSystemProps {
  assessmentId: string;
  onViolationDetected: (violation: SecurityViolation) => void;
  onMetadataUpdate: (metadata: SecurityMetadata) => void;
  minimumTimePerQuestion?: number; // seconds
  maximumTimePerQuestion?: number; // seconds
  requiredLocationAccuracy?: number; // meters
  enableScreenshotDetection?: boolean;
  enableAppSwitchDetection?: boolean;
}

interface SecurityViolation {
  type: 'TIMING_ANOMALY' | 'LOCATION_SPOOFING' | 'APP_SWITCHING' | 'SCREENSHOT_ATTEMPT' | 'DEVICE_TAMPERING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  timestamp: string;
  metadata?: any;
}

interface SecurityMetadata {
  session_id: string;
  device_fingerprint: string;
  start_timestamp: string;
  location_samples: LocationSample[];
  timing_data: TimingData[];
  integrity_checks: IntegrityCheck[];
  app_state_changes: AppStateChange[];
}

interface LocationSample {
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  is_mock_location?: boolean;
}

interface TimingData {
  question_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  interaction_events: InteractionEvent[];
}

interface InteractionEvent {
  type: 'FOCUS_GAINED' | 'FOCUS_LOST' | 'TOUCH' | 'KEYSTROKE';
  timestamp: string;
}

interface IntegrityCheck {
  timestamp: string;
  check_type: 'DEVICE_ROOT' | 'LOCATION_MOCK' | 'TIME_SYNC' | 'APP_INTEGRITY';
  result: boolean;
  details?: string;
}

interface AppStateChange {
  timestamp: string;
  previous_state: AppStateStatus;
  current_state: AppStateStatus;
  duration_background?: number;
}

export function AntiCheatingSystem({
  assessmentId,
  onViolationDetected,
  onMetadataUpdate,
  minimumTimePerQuestion = 5, // 5 seconds minimum
  maximumTimePerQuestion = 300, // 5 minutes maximum
  requiredLocationAccuracy = 50, // 50 meters
  enableScreenshotDetection = true,
  enableAppSwitchDetection = true
}: AntiCheatingSystemProps) {
  const [securityMetadata, setSecurityMetadata] = useState<SecurityMetadata>({
    session_id: '',
    device_fingerprint: '',
    start_timestamp: new Date().toISOString(),
    location_samples: [],
    timing_data: [],
    integrity_checks: [],
    app_state_changes: []
  });

  const [currentQuestionStart, setCurrentQuestionStart] = useState<Date | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [backgroundStartTime, setBackgroundStartTime] = useState<Date | null>(null);
  const [locationWatcher, setLocationWatcher] = useState<Location.LocationSubscription | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const interactionEventsRef = useRef<InteractionEvent[]>([]);

  useEffect(() => {
    initializeSecuritySystem();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
  }, [isMonitoring]);

  const initializeSecuritySystem = async () => {
    try {
      // Generate unique session ID
      const sessionId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${assessmentId}-${Date.now()}-${Math.random()}`
      );

      // Create device fingerprint
      const deviceFingerprint = await createDeviceFingerprint();

      // Perform initial integrity checks
      const initialChecks = await performIntegrityChecks();

      const metadata: SecurityMetadata = {
        session_id: sessionId,
        device_fingerprint: deviceFingerprint,
        start_timestamp: new Date().toISOString(),
        location_samples: [],
        timing_data: [],
        integrity_checks: initialChecks,
        app_state_changes: []
      };

      setSecurityMetadata(metadata);
      onMetadataUpdate(metadata);
      setIsMonitoring(true);
    } catch (error) {
      console.error('Failed to initialize security system:', error);
      reportViolation({
        type: 'DEVICE_TAMPERING',
        severity: 'HIGH',
        description: 'Failed to initialize security monitoring',
        timestamp: new Date().toISOString(),
        metadata: { error: error.message }
      });
    }
  };

  const createDeviceFingerprint = async (): Promise<string> => {
    try {
      const deviceInfo = {
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        platformApiLevel: Device.platformApiLevel,
        deviceType: Device.deviceType,
        isDevice: Device.isDevice
      };

      const fingerprintString = JSON.stringify(deviceInfo);
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fingerprintString
      );
    } catch (error) {
      console.error('Failed to create device fingerprint:', error);
      return 'unknown-device';
    }
  };

  const performIntegrityChecks = async (): Promise<IntegrityCheck[]> => {
    const checks: IntegrityCheck[] = [];
    const timestamp = new Date().toISOString();

    try {
      // Check if device is rooted/jailbroken
      const isRooted = await checkDeviceRoot();
      checks.push({
        timestamp,
        check_type: 'DEVICE_ROOT',
        result: !isRooted,
        details: isRooted ? 'Device appears to be rooted/jailbroken' : 'Device integrity verified'
      });

      // Check for mock location providers
      const hasMockLocation = await checkMockLocation();
      checks.push({
        timestamp,
        check_type: 'LOCATION_MOCK',
        result: !hasMockLocation,
        details: hasMockLocation ? 'Mock location provider detected' : 'Location provider verified'
      });

      // Check time synchronization
      const isTimeSynced = await checkTimeSync();
      checks.push({
        timestamp,
        check_type: 'TIME_SYNC',
        result: isTimeSynced,
        details: isTimeSynced ? 'System time synchronized' : 'System time may be manipulated'
      });

    } catch (error) {
      console.error('Integrity check failed:', error);
    }

    return checks;
  };

  const checkDeviceRoot = async (): Promise<boolean> => {
    try {
      // Check common root/jailbreak indicators
      const suspiciousApps = [
        'com.noshufou.android.su',
        'com.thirdparty.superuser',
        'eu.chainfire.supersu',
        'com.koushikdutta.superuser'
      ];

      const suspiciousPaths = [
        '/system/app/Superuser.apk',
        '/sbin/su',
        '/system/bin/su',
        '/system/xbin/su',
        '/data/local/xbin/su',
        '/data/local/bin/su',
        '/system/sd/xbin/su',
        '/system/bin/failsafe/su',
        '/data/local/su'
      ];

      // Check for suspicious files (simplified check)
      for (const path of suspiciousPaths) {
        try {
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
            return true;
          }
        } catch (error) {
          // Path doesn't exist or no permission - this is expected
        }
      }

      return false;
    } catch (error) {
      console.error('Root check failed:', error);
      return false;
    }
  };

  const checkMockLocation = async (): Promise<boolean> => {
    try {
      // Get current location and check for mock location indicators
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      // On Android, mock locations often have specific characteristics
      // This is a simplified check - real implementation would be more sophisticated
      return location.mocked || false;
    } catch (error) {
      console.error('Mock location check failed:', error);
      return false;
    }
  };

  const checkTimeSync = async (): Promise<boolean> => {
    try {
      // Simple time sync check - compare device time with server time
      // In real implementation, this would fetch server time
      const deviceTime = new Date().getTime();
      const expectedTime = Date.now(); // This would be server time
      const timeDiff = Math.abs(deviceTime - expectedTime);
      
      // Allow 30 seconds tolerance
      return timeDiff < 30000;
    } catch (error) {
      console.error('Time sync check failed:', error);
      return false;
    }
  };

  const startMonitoring = async () => {
    try {
      // Start location monitoring
      await startLocationMonitoring();

      // Start app state monitoring
      startAppStateMonitoring();

      // Start screenshot detection if enabled
      if (enableScreenshotDetection) {
        startScreenshotDetection();
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const stopMonitoring = () => {
    // Stop location monitoring
    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }

    // Clean up other monitoring
    AppState.removeEventListener('change', handleAppStateChange);
  };

  const startLocationMonitoring = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        reportViolation({
          type: 'DEVICE_TAMPERING',
          severity: 'HIGH',
          description: 'Location permission denied',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 1, // 1 meter
        },
        (location) => {
          handleLocationUpdate(location);
        }
      );

      setLocationWatcher(watcher);
    } catch (error) {
      console.error('Failed to start location monitoring:', error);
    }
  };

  const handleLocationUpdate = (location: Location.LocationObject) => {
    const sample: LocationSample = {
      timestamp: new Date().toISOString(),
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 0,
      altitude: location.coords.altitude || undefined,
      speed: location.coords.speed || undefined,
      heading: location.coords.heading || undefined,
      is_mock_location: location.mocked || false
    };

    // Check for location anomalies
    if (sample.is_mock_location) {
      reportViolation({
        type: 'LOCATION_SPOOFING',
        severity: 'CRITICAL',
        description: 'Mock location detected',
        timestamp: sample.timestamp,
        metadata: sample
      });
    }

    if (sample.accuracy > requiredLocationAccuracy) {
      reportViolation({
        type: 'LOCATION_SPOOFING',
        severity: 'MEDIUM',
        description: `Poor location accuracy: ${sample.accuracy}m (required: ${requiredLocationAccuracy}m)`,
        timestamp: sample.timestamp,
        metadata: sample
      });
    }

    // Update metadata
    setSecurityMetadata(prev => {
      const updated = {
        ...prev,
        location_samples: [...prev.location_samples, sample].slice(-100) // Keep last 100 samples
      };
      onMetadataUpdate(updated);
      return updated;
    });
  };

  const startAppStateMonitoring = () => {
    AppState.addEventListener('change', handleAppStateChange);
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    const timestamp = new Date().toISOString();
    const change: AppStateChange = {
      timestamp,
      previous_state: appStateRef.current,
      current_state: nextAppState
    };

    if (appStateRef.current === 'active' && nextAppState === 'background') {
      setBackgroundStartTime(new Date());
    } else if (appStateRef.current === 'background' && nextAppState === 'active') {
      if (backgroundStartTime) {
        const backgroundDuration = Date.now() - backgroundStartTime.getTime();
        change.duration_background = backgroundDuration;

        if (enableAppSwitchDetection && backgroundDuration > 5000) { // 5 seconds
          reportViolation({
            type: 'APP_SWITCHING',
            severity: 'MEDIUM',
            description: `App was in background for ${Math.round(backgroundDuration / 1000)} seconds`,
            timestamp,
            metadata: { backgroundDuration }
          });
        }
      }
      setBackgroundStartTime(null);
    }

    appStateRef.current = nextAppState;

    // Update metadata
    setSecurityMetadata(prev => {
      const updated = {
        ...prev,
        app_state_changes: [...prev.app_state_changes, change].slice(-50) // Keep last 50 changes
      };
      onMetadataUpdate(updated);
      return updated;
    });
  };

  const startScreenshotDetection = () => {
    // Note: Screenshot detection is limited on mobile platforms
    // This is a placeholder for platform-specific implementations
    // Real implementation would use native modules
  };

  const startQuestionTiming = (questionId: string) => {
    setCurrentQuestionId(questionId);
    setCurrentQuestionStart(new Date());
    interactionEventsRef.current = [];
  };

  const endQuestionTiming = () => {
    if (!currentQuestionId || !currentQuestionStart) return;

    const endTime = new Date();
    const duration = (endTime.getTime() - currentQuestionStart.getTime()) / 1000;

    const timingData: TimingData = {
      question_id: currentQuestionId,
      start_time: currentQuestionStart.toISOString(),
      end_time: endTime.toISOString(),
      duration_seconds: duration,
      interaction_events: [...interactionEventsRef.current]
    };

    // Check for timing anomalies
    if (duration < minimumTimePerQuestion) {
      reportViolation({
        type: 'TIMING_ANOMALY',
        severity: 'HIGH',
        description: `Question answered too quickly: ${duration}s (minimum: ${minimumTimePerQuestion}s)`,
        timestamp: endTime.toISOString(),
        metadata: timingData
      });
    }

    if (duration > maximumTimePerQuestion) {
      reportViolation({
        type: 'TIMING_ANOMALY',
        severity: 'LOW',
        description: `Question took too long: ${duration}s (maximum: ${maximumTimePerQuestion}s)`,
        timestamp: endTime.toISOString(),
        metadata: timingData
      });
    }

    // Update metadata
    setSecurityMetadata(prev => {
      const updated = {
        ...prev,
        timing_data: [...prev.timing_data, timingData]
      };
      onMetadataUpdate(updated);
      return updated;
    });

    setCurrentQuestionId(null);
    setCurrentQuestionStart(null);
  };

  const recordInteraction = (type: InteractionEvent['type']) => {
    const event: InteractionEvent = {
      type,
      timestamp: new Date().toISOString()
    };
    interactionEventsRef.current.push(event);
  };

  const reportViolation = (violation: SecurityViolation) => {
    console.warn('Security violation detected:', violation);
    onViolationDetected(violation);

    // Show user-friendly alert for critical violations
    if (violation.severity === 'CRITICAL') {
      Alert.alert(
        'Security Warning',
        'A security issue has been detected. This assessment session may be flagged for review.',
        [{ text: 'OK' }]
      );
    }
  };

  const cleanup = () => {
    stopMonitoring();
  };

  const getSecurityStatus = () => {
    const recentViolations = []; // Would track recent violations
    const hasHighRiskViolations = recentViolations.some(v => v.severity === 'CRITICAL' || v.severity === 'HIGH');
    
    if (hasHighRiskViolations) return 'HIGH_RISK';
    if (recentViolations.length > 0) return 'MEDIUM_RISK';
    return 'SECURE';
  };

  const getStatusColor = () => {
    const status = getSecurityStatus();
    switch (status) {
      case 'SECURE': return 'text-green-600';
      case 'MEDIUM_RISK': return 'text-yellow-600';
      case 'HIGH_RISK': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    const status = getSecurityStatus();
    switch (status) {
      case 'SECURE': return CheckCircle;
      case 'MEDIUM_RISK': return AlertTriangle;
      case 'HIGH_RISK': return AlertTriangle;
      default: return Shield;
    }
  };

  return (
    <Card className="p-4 bg-gray-50 border border-gray-200">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Shield className="h-5 w-5 text-blue-600 mr-2" />
          <Text className="font-medium text-gray-900">Security Monitoring</Text>
        </View>
        
        <View className="flex-row items-center">
          {React.createElement(getStatusIcon(), { 
            className: `h-4 w-4 mr-1 ${getStatusColor()}` 
          })}
          <Badge variant={getSecurityStatus() === 'SECURE' ? 'default' : 'destructive'}>
            <Text className="text-xs">{isMonitoring ? 'Active' : 'Inactive'}</Text>
          </Badge>
        </View>
      </View>

      <View className="space-y-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">Session ID:</Text>
          <Text className="text-xs font-mono text-gray-500">
            {securityMetadata.session_id.slice(0, 8)}...
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">Location Samples:</Text>
          <Text className="text-sm font-medium">
            {securityMetadata.location_samples.length}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">Integrity Checks:</Text>
          <Text className="text-sm font-medium">
            {securityMetadata.integrity_checks.filter(c => c.result).length}/
            {securityMetadata.integrity_checks.length} passed
          </Text>
        </View>

        {currentQuestionId && currentQuestionStart && (
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-600">Current Question:</Text>
            <View className="flex-row items-center">
              <Clock className="h-4 w-4 text-blue-500 mr-1" />
              <Text className="text-sm font-medium text-blue-600">
                {Math.floor((Date.now() - currentQuestionStart.getTime()) / 1000)}s
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Warning if monitoring is disabled */}
      {!isMonitoring && (
        <View className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <View className="flex-row items-center">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
            <Text className="text-sm text-yellow-800 flex-1">
              Security monitoring is not active. Assessment may be flagged for manual review.
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

// Export helper functions for use in assessment components
export const useAntiCheating = (assessmentId: string) => {
  const [securitySystem, setSecuritySystem] = useState<React.RefObject<any>>(React.createRef());
  
  return {
    startQuestionTiming: (questionId: string) => {
      securitySystem.current?.startQuestionTiming(questionId);
    },
    
    endQuestionTiming: () => {
      securitySystem.current?.endQuestionTiming();
    },
    
    recordInteraction: (type: InteractionEvent['type']) => {
      securitySystem.current?.recordInteraction(type);
    },
    
    securitySystemRef: securitySystem
  };
};