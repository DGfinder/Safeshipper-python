/**
 * Permissions Service
 * Handles all app permissions requests
 */

import {Platform, Alert, Linking} from 'react-native';
import {PermissionsAndroid} from 'react-native';

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      // Add background location permission for Android 10+
      if (Platform.Version >= 29) {
        permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);

      const hasLocationPermission = 
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted' ||
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === 'granted';

      if (!hasLocationPermission) {
        Alert.alert(
          'Location Permission Required',
          'SafeShipper needs location access to track your deliveries and provide real-time updates to customers.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ]
        );
        return false;
      }

      // Check background permission separately
      if (Platform.Version >= 29) {
        const hasBackgroundPermission = 
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION] === 'granted';

        if (!hasBackgroundPermission) {
          Alert.alert(
            'Background Location Permission',
            'For the best tracking experience, please allow location access "All the time" in your device settings.',
            [
              {text: 'Maybe Later', style: 'cancel'},
              {text: 'Open Settings', onPress: () => Linking.openSettings()},
            ]
          );
        }
      }

      return hasLocationPermission;
    }

    // iOS handling would go here
    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

export const checkLocationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return hasPermission;
    }
    
    // iOS check would go here
    return true;
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
};