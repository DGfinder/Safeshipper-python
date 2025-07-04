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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,

      login: async (email: string, _password: string) => {
        set({ isLoading: true });
        
        // Simulate API call with basic validation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simple email validation for demo
        if (!email.includes('@')) {
          set({ isLoading: false });
          throw new Error('Invalid email');
        }
        
        // Mock user data - in real app, this would come from API
        const mockUser: User = {
          id: '1',
          username: email.split('@')[0],
          email: email,
          role: 'Admin',
          avatar: email.split('@')[0].substring(0, 2).toUpperCase()
        };
        
        set({ 
          user: mockUser, 
          isAuthenticated: true, 
          isLoading: false 
        });
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false 
        });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
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