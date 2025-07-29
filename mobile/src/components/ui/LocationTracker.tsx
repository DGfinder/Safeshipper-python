"use client";

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert } from 'react-native';
import { Badge } from './Badge';
import { Button } from './Button';
import { 
  MapPin, 
  Wifi, 
  WifiOff, 
  Satellite,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react-native';
import * as Location from 'expo-location';

interface LocationTrackerProps {
  onLocationUpdate?: (location: Location.LocationObject) => void;
  onLocationError?: (error: string) => void;
  accuracyThreshold?: number; // meters
  updateInterval?: number; // milliseconds
  className?: string;
}

interface LocationState {
  location: Location.LocationObject | null;
  accuracy: number | null;
  lastUpdate: Date | null;
  isTracking: boolean;
  hasPermission: boolean;
  error: string | null;
}

export function LocationTracker({
  onLocationUpdate,
  onLocationError,
  accuracyThreshold = 20, // 20 meters default accuracy threshold
  updateInterval = 10000, // 10 seconds default update interval
  className = ''
}: LocationTrackerProps) {
  const [locationState, setLocationState] = useState<LocationState>({
    location: null,
    accuracy: null,
    lastUpdate: null,
    isTracking: false,
    hasPermission: false,
    error: null
  });

  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    requestLocationPermission();
    
    return () => {
      stopLocationTracking();
    };
  }, []);

  useEffect(() => {
    if (locationState.location && onLocationUpdate) {
      onLocationUpdate(locationState.location);
    }
  }, [locationState.location, onLocationUpdate]);

  useEffect(() => {
    if (locationState.error && onLocationError) {
      onLocationError(locationState.error);
    }
  }, [locationState.error, onLocationError]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationState(prev => ({
          ...prev,
          hasPermission: false,
          error: 'Location permission denied'
        }));
        return;
      }

      setLocationState(prev => ({ ...prev, hasPermission: true, error: null }));
      
      // Start tracking automatically if permission is granted
      startLocationTracking();
    } catch (error) {
      setLocationState(prev => ({
        ...prev,
        error: 'Failed to request location permission'
      }));
    }
  };

  const startLocationTracking = async () => {
    if (!locationState.hasPermission) {
      await requestLocationPermission();
      return;
    }

    try {
      setLocationState(prev => ({ ...prev, isTracking: true, error: null }));

      // Get initial location with high accuracy
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        maximumAge: 10000, // 10 seconds
        timeout: 15000, // 15 seconds timeout
      });

      setLocationState(prev => ({
        ...prev,
        location: initialLocation,
        accuracy: initialLocation.coords.accuracy,
        lastUpdate: new Date()
      }));

      // Start watching location changes
      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: updateInterval,
          distanceInterval: 5, // Update every 5 meters
        },
        (location) => {
          setLocationState(prev => ({
            ...prev,
            location,
            accuracy: location.coords.accuracy,
            lastUpdate: new Date()
          }));
        }
      );

    } catch (error) {
      console.error('Location tracking error:', error);
      setLocationState(prev => ({
        ...prev,
        isTracking: false,
        error: 'Failed to start location tracking'
      }));
    }
  };

  const stopLocationTracking = () => {
    if (watchSubscription.current) {
      watchSubscription.current.remove();
      watchSubscription.current = null;
    }
    
    setLocationState(prev => ({ ...prev, isTracking: false }));
  };

  const getAccuracyStatus = () => {
    if (!locationState.accuracy) return 'unknown';
    
    if (locationState.accuracy <= accuracyThreshold) {
      return 'good';
    } else if (locationState.accuracy <= accuracyThreshold * 2) {
      return 'fair';
    } else {
      return 'poor';
    }
  };

  const getAccuracyColor = () => {
    const status = getAccuracyStatus();
    switch (status) {
      case 'good': return 'text-green-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAccuracyIcon = () => {
    const status = getAccuracyStatus();
    switch (status) {
      case 'good': return CheckCircle;
      case 'fair': return AlertTriangle;
      case 'poor': return AlertTriangle;
      default: return Satellite;
    }
  };

  const formatCoordinate = (coord: number) => {
    return coord.toFixed(6);
  };

  const formatAccuracy = () => {
    if (!locationState.accuracy) return 'Unknown';
    return `±${Math.round(locationState.accuracy)}m`;
  };

  const formatLastUpdate = () => {
    if (!locationState.lastUpdate) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - locationState.lastUpdate.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return locationState.lastUpdate.toLocaleTimeString();
  };

  if (!locationState.hasPermission) {
    return (
      <View className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <View className="flex-row items-center mb-2">
          <WifiOff className="h-5 w-5 text-red-600 mr-2" />
          <Text className="font-medium text-red-800">Location Permission Required</Text>
        </View>
        <Text className="text-sm text-red-700 mb-3">
          Location access is required for accurate assessment tracking and compliance.
        </Text>
        <Button 
          onPress={requestLocationPermission}
          size="sm"
          className="self-start"
        >
          <Text>Grant Permission</Text>
        </Button>
      </View>
    );
  }

  if (locationState.error) {
    return (
      <View className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <View className="flex-row items-center mb-2">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <Text className="font-medium text-red-800">Location Error</Text>
        </View>
        <Text className="text-sm text-red-700 mb-3">{locationState.error}</Text>
        <Button 
          onPress={startLocationTracking}
          size="sm"
          variant="outline"
          className="self-start"
        >
          <Text>Retry</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className={`p-4 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <MapPin className="h-5 w-5 text-blue-600 mr-2" />
          <Text className="font-medium text-gray-900">Location Tracking</Text>
        </View>
        
        <View className="flex-row items-center space-x-2">
          {locationState.isTracking ? (
            <Badge variant="default" className="flex-row items-center">
              <Wifi className="h-3 w-3 mr-1" />
              <Text className="text-xs">Active</Text>
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex-row items-center">
              <WifiOff className="h-3 w-3 mr-1" />
              <Text className="text-xs">Inactive</Text>
            </Badge>
          )}
        </View>
      </View>

      {/* Location Data */}
      {locationState.location ? (
        <View className="space-y-2">
          {/* Coordinates */}
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Coordinates:</Text>
            <Text className="text-sm font-mono">
              {formatCoordinate(locationState.location.coords.latitude)}, {formatCoordinate(locationState.location.coords.longitude)}
            </Text>
          </View>

          {/* Accuracy */}
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-gray-600">Accuracy:</Text>
            <View className="flex-row items-center">
              {React.createElement(getAccuracyIcon(), { 
                className: `h-4 w-4 mr-1 ${getAccuracyColor()}` 
              })}
              <Text className={`text-sm font-medium ${getAccuracyColor()}`}>
                {formatAccuracy()}
              </Text>
            </View>
          </View>

          {/* Altitude */}
          {locationState.location.coords.altitude && (
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-600">Altitude:</Text>
              <Text className="text-sm font-medium">
                {Math.round(locationState.location.coords.altitude)}m
              </Text>
            </View>
          )}

          {/* Speed */}
          {locationState.location.coords.speed && locationState.location.coords.speed > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-600">Speed:</Text>
              <Text className="text-sm font-medium">
                {Math.round(locationState.location.coords.speed * 3.6)} km/h
              </Text>
            </View>
          )}

          {/* Last Update */}
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-gray-600">Last Update:</Text>
            <View className="flex-row items-center">
              <Clock className="h-4 w-4 text-gray-400 mr-1" />
              <Text className="text-sm text-gray-600">{formatLastUpdate()}</Text>
            </View>
          </View>

          {/* Accuracy Warning */}
          {locationState.accuracy && locationState.accuracy > accuracyThreshold && (
            <View className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <View className="flex-row items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                <Text className="text-sm text-yellow-800 flex-1">
                  Low accuracy detected. Consider moving to an open area for better GPS signal.
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View className="py-4">
          <Text className="text-sm text-gray-500 text-center">
            {locationState.isTracking ? 'Acquiring location...' : 'Location not available'}
          </Text>
        </View>
      )}

      {/* Controls */}
      <View className="flex-row justify-end mt-4 pt-3 border-t border-gray-100">
        {locationState.isTracking ? (
          <Button 
            onPress={stopLocationTracking}
            size="sm"
            variant="outline"
          >
            <Text>Stop Tracking</Text>
          </Button>
        ) : (
          <Button 
            onPress={startLocationTracking}
            size="sm"
          >
            <Text>Start Tracking</Text>
          </Button>
        )}
      </View>
    </View>
  );
}