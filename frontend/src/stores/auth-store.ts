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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setHydrated: (hydrated: boolean) => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      token: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          // Call the actual backend API
          const response = await fetch('/api/v1/users/auth/login/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed');
          }
          
          const data = await response.json();
          
          // Store tokens
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
          }
          
          // Transform backend user data to frontend format
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
            token: data.access_token
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
            token: null
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