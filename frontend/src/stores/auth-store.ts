import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  token: string | null;
  requiresMFA: boolean;
  tempToken: string | null;
  availableMFAMethods: any[];
  login: (email: string, password: string) => Promise<any>;
  loginWithMFA: (tempToken: string, deviceId: string, code: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setHydrated: (hydrated: boolean) => void;
  getToken: () => string | null;
  clearMFAState: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      token: null,
      requiresMFA: false,
      tempToken: null,
      availableMFAMethods: [],

      login: async (email: string, password: string) => {
        set({ isLoading: true, requiresMFA: false });
        
        try {
          // First try MFA challenge endpoint
          const response = await fetch('/api/v1/auth/mfa/challenge/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: email, password }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed');
          }
          
          const data = await response.json();
          
          if (data.requires_mfa) {
            // User requires MFA verification
            set({
              isLoading: false,
              requiresMFA: true,
              tempToken: data.temp_token,
              availableMFAMethods: data.available_methods
            });
            return { requiresMFA: true, availableMethods: data.available_methods };
          } else {
            // No MFA required, complete login
            if (typeof window !== 'undefined') {
              localStorage.setItem('access_token', data.access_token);
              localStorage.setItem('refresh_token', data.refresh_token);
            }
            
            const user: User = {
              id: data.user.id.toString(),
              username: data.user.username,
              email: data.user.email,
              role: data.user.role,
              avatar: data.user.username.substring(0, 2).toUpperCase()
            };
            
            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false,
              token: data.access_token,
              requiresMFA: false
            });
            
            return { requiresMFA: false, user };
          }
          
        } catch (error) {
          set({ isLoading: false, requiresMFA: false });
          throw error;
        }
      },

      loginWithMFA: async (tempToken: string, deviceId: string, code: string) => {
        set({ isLoading: true });
        
        try {
          const response = await fetch('/api/v1/auth/mfa/verify-login/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ temp_token: tempToken, device_id: deviceId, code }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'MFA verification failed');
          }
          
          const data = await response.json();
          
          // Store tokens
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
          }
          
          const user: User = {
            id: data.user.id.toString(),
            username: data.user.username,
            email: data.user.email,
            role: data.user.role,
            avatar: data.user.username.substring(0, 2).toUpperCase()
          };
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false,
            token: data.access_token,
            requiresMFA: false,
            tempToken: null,
            availableMFAMethods: []
          });
          
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          if (typeof window !== 'undefined') {
            const refreshToken = localStorage.getItem('refresh_token');
            
            // Call backend logout endpoint
            await fetch('/api/v1/users/auth/logout/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
          }
        } catch (error) {
          console.warn('Logout API call failed:', error);
        } finally {
          // Clear local storage and state regardless of API call result
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
          
          set({ 
            user: null, 
            isAuthenticated: false,
            token: null,
            requiresMFA: false,
            tempToken: null,
            availableMFAMethods: []
          });
        }
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },

      getToken: () => {
        if (typeof window === 'undefined') return null;
        return get().token || localStorage.getItem('access_token');
      },

      clearMFAState: () => {
        set({
          requiresMFA: false,
          tempToken: null,
          availableMFAMethods: []
        });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);