import { useState, useEffect } from 'react';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
}

export const useAuth = (): AuthState => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  useEffect(() => {
    // Mock authentication check
    const checkAuth = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // For development, assume user is authenticated
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', name: 'Demo User' },
        });
      } catch (error) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
      }
    };

    checkAuth();
  }, []);

  return state;
};