/**
 * Location Service
 * Handles GPS location tracking and background location updates
 */

import Geolocation from 'react-native-geolocation-service';
import BackgroundGeolocation from 'react-native-background-geolocation';
import {Platform, Alert, AppState} from 'react-native';
import {apiService, LocationUpdate} from './api';

interface LocationConfig {
  enableHighAccuracy: boolean;
  distanceFilter: number;  // meters
  interval: number;        // milliseconds
  fastestInterval: number; // milliseconds
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

class LocationService {
  private isTracking = false;
  private config: LocationConfig;
  private lastLocationSent: LocationData | null = null;

  constructor() {
    this.config = {
      enableHighAccuracy: true,
      distanceFilter: 10,      // Send update every 10 meters
      interval: 30000,         // Check location every 30 seconds
      fastestInterval: 15000,  // Fastest update interval 15 seconds
    };
  }

  async initialize(): Promise<void> {
    try {
      // Configure background geolocation
      await BackgroundGeolocation.configure({
        locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
        desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
        stationaryRadius: 20,
        distanceFilter: this.config.distanceFilter,
        notificationTitle: 'SafeShipper Tracking',
        notificationText: 'Location tracking is active',
        debug: __DEV__,
        startOnBoot: false,
        startForeground: false,
        interval: this.config.interval,
        fastestInterval: this.config.fastestInterval,
        activitiesInterval: 300000, // 5 minutes
        saveBatteryOnBackground: true,
        stopOnTerminate: false,
        stopOnStillActivity: false,
        maxLocations: 1000,
        // Additional settings for better accuracy
        locationProvider: BackgroundGeolocation.DISTANCE_FILTER_PROVIDER,
        url: '', // We'll handle uploads manually
        autoSync: false,
      });

      // Set up location listeners
      this.setupLocationListeners();

      console.log('Location service initialized');
    } catch (error) {
      console.error('Error initializing location service:', error);
      throw error;
    }
  }

  private setupLocationListeners(): void {
    // Location updates
    BackgroundGeolocation.on('location', this.handleLocationUpdate);

    // Error handling
    BackgroundGeolocation.on('error', (error: any) => {
      console.error('Background location error:', error);
    });

    // App state changes
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleLocationUpdate = async (location: any): Promise<void> => {
    try {
      const locationData: LocationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed || undefined,
        heading: location.bearing || undefined,
        timestamp: location.time,
      };

      // Check if this location is significantly different from the last one
      if (this.shouldSendLocation(locationData)) {
        await this.sendLocationToServer(locationData);
        this.lastLocationSent = locationData;
      }

      console.log('Location updated:', {
        lat: locationData.latitude.toFixed(6),
        lng: locationData.longitude.toFixed(6),
        accuracy: locationData.accuracy,
      });
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  };

  private shouldSendLocation(newLocation: LocationData): boolean {
    if (!this.lastLocationSent) {
      return true;
    }

    // Calculate distance from last sent location
    const distance = this.calculateDistance(
      this.lastLocationSent.latitude,
      this.lastLocationSent.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    // Send if moved more than 10 meters or if it's been more than 2 minutes
    const timeDiff = newLocation.timestamp - this.lastLocationSent.timestamp;
    return distance > 10 || timeDiff > 120000; // 2 minutes
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  private async sendLocationToServer(locationData: LocationData): Promise<void> {
    try {
      const locationUpdate: LocationUpdate = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        speed: locationData.speed,
        heading: locationData.heading,
        timestamp: new Date(locationData.timestamp).toISOString(),
      };

      await apiService.updateLocation(locationUpdate);
      console.log('Location sent to server successfully');
    } catch (error) {
      console.error('Error sending location to server:', error);
      // Don't throw error here - we don't want to stop location tracking
      // if server communication fails
    }
  }

  private handleAppStateChange = (nextAppState: string): void => {
    if (nextAppState === 'background' && this.isTracking) {
      console.log('App went to background, location tracking continues');
    } else if (nextAppState === 'active' && this.isTracking) {
      console.log('App came to foreground, location tracking active');
    }
  };

  async startTracking(): Promise<void> {
    if (this.isTracking) {
      console.log('Location tracking already active');
      return;
    }

    try {
      // Request permissions
      const permission = await this.requestLocationPermission();
      if (!permission) {
        throw new Error('Location permission not granted');
      }

      // Start background location tracking
      await BackgroundGeolocation.start();
      this.isTracking = true;

      console.log('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    try {
      await BackgroundGeolocation.stop();
      this.isTracking = false;
      this.lastLocationSent = null;

      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
            timestamp: position.timestamp,
          };
          resolve(locationData);
        },
        (error) => {
          console.error('Error getting current location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  private async requestLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const {PermissionsAndroid} = require('react-native');
        
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION] === 'granted'
        );
      } else {
        // iOS permission handling
        const permission = await Geolocation.requestAuthorization('whenInUse');
        return permission === 'granted';
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  isLocationTrackingActive(): boolean {
    return this.isTracking;
  }

  getLastKnownLocation(): LocationData | null {
    return this.lastLocationSent;
  }

  // Clean up resources
  destroy(): void {
    this.stopTracking();
    BackgroundGeolocation.removeAllListeners();
    AppState.removeEventListener('change', this.handleAppStateChange);
  }
}

export const locationService = new LocationService();
export default locationService;