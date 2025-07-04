/**
 * Authentication Context
 * Manages user authentication state and operations
 */

import React, {createContext, useContext, useEffect, useState, ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import {apiService, LoginCredentials, User} from '../services/api';
import {secureStorage} from '../services/secureStorage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize authentication state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);

      // Check if we have stored tokens
      const tokens = await secureStorage.getTokens();
      if (!tokens) {
        setIsLoading(false);
        return;
      }

      // Store access token for API calls
      await AsyncStorage.setItem('access_token', tokens.accessToken);

      // Try to get current user data
      const userData = await apiService.getCurrentUser();
      setUser(userData);

      console.log('Authentication initialized successfully');
    } catch (error) {
      console.error('Error initializing auth:', error);
      // Clear invalid tokens
      await secureStorage.clearAll();
      await AsyncStorage.removeItem('access_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);

      const response = await apiService.login(credentials);
      
      // Validate that the user is a driver
      if (response.user.role !== 'DRIVER') {
        throw new Error('This app is only for drivers. Please contact your administrator.');
      }

      // Store tokens securely
      await secureStorage.storeTokens(
        response.access_token,
        response.refresh_token
      );

      // Store user data
      await secureStorage.storeUserData(response.user);

      // Store access token for immediate API use
      await AsyncStorage.setItem('access_token', response.access_token);

      setUser(response.user);

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome back, ${response.user.first_name}!`,
      });

      console.log('Login successful for:', response.user.email);
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errorMessage,
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // Get refresh token for logout API call
      const tokens = await secureStorage.getTokens();
      if (tokens?.refreshToken) {
        try {
          await apiService.logout(tokens.refreshToken);
        } catch (error) {
          console.warn('Error calling logout API:', error);
          // Continue with local logout even if API call fails
        }
      }

      // Clear all stored data
      await secureStorage.clearAll();
      await AsyncStorage.removeItem('access_token');

      setUser(null);

      Toast.show({
        type: 'info',
        text1: 'Logged Out',
        text2: 'You have been successfully logged out.',
      });

      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local data
      await secureStorage.clearAll();
      await AsyncStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData);
      await secureStorage.storeUserData(userData);
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // If refresh fails, user might need to login again
      if (error instanceof Error && error.message.includes('401')) {
        await logout();
      }
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};