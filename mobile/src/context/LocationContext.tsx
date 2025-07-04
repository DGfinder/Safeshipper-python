/**
 * Location Context
 * Manages location tracking state and operations
 */

import React, {createContext, useContext, useEffect, useState, ReactNode} from 'react';
import {AppState, Alert} from 'react-native';
import Toast from 'react-native-toast-message';

import {locationService} from '../services/location';
import {useAuth} from './AuthContext';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

interface LocationContextType {
  isTracking: boolean;
  currentLocation: LocationData | null;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  getCurrentLocation: () => Promise<LocationData | null>;
  hasLocationPermission: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({children}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const {isAuthenticated, user} = useAuth();

  // Initialize location service when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isInitialized) {
      initializeLocationService();
    } else if (!isAuthenticated && isInitialized) {
      // Clean up when user logs out
      cleanupLocationService();
    }
  }, [isAuthenticated, user, isInitialized]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && isAuthenticated && !isTracking) {
        // Check if we should resume tracking when app becomes active
        checkTrackingStatus();
      }
    };

    AppState.addEventListener('change', handleAppStateChange);
    return () => AppState.removeEventListener('change', handleAppStateChange);
  }, [isAuthenticated, isTracking]);

  const initializeLocationService = async () => {
    try {
      await locationService.initialize();
      setIsInitialized(true);
      setHasLocationPermission(true);

      // Auto-start tracking for drivers when they login
      if (user?.role === 'DRIVER') {
        await startLocationTracking();
      }

      console.log('Location service initialized for user:', user?.email);
    } catch (error) {
      console.error('Error initializing location service:', error);
      setHasLocationPermission(false);
      
      Toast.show({
        type: 'error',
        text1: 'Location Service Error',
        text2: 'Failed to initialize location tracking',
      });
    }
  };

  const cleanupLocationService = async () => {
    try {
      await locationService.stopTracking();
      locationService.destroy();
      setIsTracking(false);
      setCurrentLocation(null);
      setIsInitialized(false);
      setHasLocationPermission(false);
    } catch (error) {
      console.error('Error cleaning up location service:', error);
    }
  };

  const startLocationTracking = async () => {
    try {
      if (!hasLocationPermission) {
        Alert.alert(
          'Location Permission Required',
          'SafeShipper needs location access to track deliveries and provide real-time updates.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Try Again', onPress: () => initializeLocationService()},
          ]
        );
        return;
      }

      await locationService.startTracking();
      setIsTracking(true);

      // Get initial location
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }

      Toast.show({
        type: 'success',
        text1: 'Location Tracking Started',
        text2: 'Your location will be shared with dispatch',
      });

      console.log('Location tracking started successfully');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      
      Toast.show({
        type: 'error',
        text1: 'Tracking Error',
        text2: 'Failed to start location tracking',
      });
    }
  };

  const stopLocationTracking = async () => {
    try {
      await locationService.stopTracking();
      setIsTracking(false);

      Toast.show({
        type: 'info',
        text1: 'Location Tracking Stopped',
        text2: 'Location sharing has been disabled',
      });

      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  };

  const getCurrentLocationManual = async (): Promise<LocationData | null> => {
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      
      Toast.show({
        type: 'error',
        text1: 'Location Error',
        text2: 'Failed to get current location',
      });
      
      return null;
    }
  };

  const checkTrackingStatus = () => {
    const isServiceTracking = locationService.isLocationTrackingActive();
    if (isServiceTracking !== isTracking) {
      setIsTracking(isServiceTracking);
    }

    const lastLocation = locationService.getLastKnownLocation();
    if (lastLocation) {
      setCurrentLocation(lastLocation);
    }
  };

  const value: LocationContextType = {
    isTracking,
    currentLocation,
    startTracking: startLocationTracking,
    stopTracking: stopLocationTracking,
    getCurrentLocation: getCurrentLocationManual,
    hasLocationPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};