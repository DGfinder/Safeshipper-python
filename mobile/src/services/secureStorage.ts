/**
 * Secure Storage Service
 * Handles secure storage of authentication tokens using react-native-keychain
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'safeshipper_access_token';
const REFRESH_TOKEN_KEY = 'safeshipper_refresh_token';
const USER_DATA_KEY = 'safeshipper_user_data';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

class SecureStorageService {
  // Store authentication tokens securely
  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Store tokens in Keychain (iOS) or EncryptedSharedPreferences (Android)
      await Keychain.setCredentials(ACCESS_TOKEN_KEY, '', accessToken);
      await Keychain.setCredentials(REFRESH_TOKEN_KEY, '', refreshToken);
    } catch (error) {
      console.error('Error storing tokens securely:', error);
      // Fallback to AsyncStorage (less secure but functional)
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  // Retrieve authentication tokens
  async getTokens(): Promise<StoredTokens | null> {
    try {
      // Try to get from Keychain first
      const accessTokenResult = await Keychain.getCredentials(ACCESS_TOKEN_KEY);
      const refreshTokenResult = await Keychain.getCredentials(REFRESH_TOKEN_KEY);

      if (accessTokenResult && refreshTokenResult) {
        return {
          accessToken: accessTokenResult.password,
          refreshToken: refreshTokenResult.password,
        };
      }
    } catch (error) {
      console.error('Error getting tokens from Keychain:', error);
    }

    try {
      // Fallback to AsyncStorage
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
    } catch (error) {
      console.error('Error getting tokens from AsyncStorage:', error);
    }

    return null;
  }

  // Get just the access token
  async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.accessToken || null;
  }

  // Clear all stored tokens
  async clearTokens(): Promise<void> {
    try {
      await Keychain.resetCredentials(ACCESS_TOKEN_KEY);
      await Keychain.resetCredentials(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing tokens from Keychain:', error);
    }

    try {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing tokens from AsyncStorage:', error);
    }
  }

  // Store user data (non-sensitive)
  async storeUserData(userData: any): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  // Get stored user data
  async getUserData(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Clear user data
  async clearUserData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_DATA_KEY);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }

  // Clear all stored data
  async clearAll(): Promise<void> {
    await this.clearTokens();
    await this.clearUserData();
  }
}

export const secureStorage = new SecureStorageService();
export default secureStorage;