/**
 * SafeShipper Mobile Driver App
 * Main Application Component
 */

import React, {useEffect} from 'react';
import {
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AppNavigator} from './src/navigation/AppNavigator';
import {AuthProvider, useAuth} from './src/context/AuthContext';
import {LocationProvider} from './src/context/LocationContext';
import {requestLocationPermission} from './src/services/permissions';
import {LoadingScreen} from './src/screens/LoadingScreen';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = (): JSX.Element => {
  useEffect(() => {
    // Request location permissions on app start
    requestLocationPermission();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LocationProvider>
            <NavigationContainer>
              <StatusBar
                barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
                backgroundColor="#2563eb"
              />
              <AppContent />
            </NavigationContainer>
            <Toast />
          </LocationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

const AppContent = () => {
  const {isLoading} = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <AppNavigator />;
};

export default App;