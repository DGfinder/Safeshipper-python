/**
 * SafeShipper Mobile App
 * Dangerous Goods Management Mobile Application
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AppNavigator } from './src/navigation/AppNavigator';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Custom theme for React Native Paper
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007AFF',
    secondary: '#34C759',
    tertiary: '#FF9500',
    surface: '#FFFFFF',
    background: '#F2F2F7',
    onSurface: '#000000',
    onBackground: '#000000',
    error: '#FF3B30',
    onError: '#FFFFFF',
  },
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <StatusBar
              barStyle="dark-content"
              backgroundColor="transparent"
              translucent
            />
            <AppNavigator />
            <Toast />
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;