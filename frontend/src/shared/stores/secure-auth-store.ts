/**
 * Secure Authentication Store
 * Replaces localStorage-based auth with secure httpOnly cookies
 * Implements proper session management and CSRF protection
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { secureAuth } from '../services/secure-auth';

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'DISPATCHER' | 'DRIVER' | 'CUSTOMER';
  permissions: string[];
  company?: {
    id: string;
    name: string;
  };
  avatar?: string;
  isDemo?: boolean;
  mfaEnabled?: boolean;
  lastLoginAt?: string;
  profile?: {
    firstName: string;
    lastName: string;
    phone?: string;
    timezone?: string;
    language?: string;
  };
}

interface AuthState {
  // Authentication status
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  // User data
  user: User | null;
  
  // Session management
  sessionExpiry: number | null;
  lastActivity: number;
  
  // Demo mode
  isDemoMode: boolean;
  
  // MFA
  requiresMFA: boolean;
  mfaSetupRequired: boolean;
  
  // Error handling
  error: string | null;
}

interface AuthActions {
  // Authentication
  login: (email: string, password: string, mfaCode?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  demoLogin: (userType: string) => Promise<boolean>;
  
  // Session management
  initializeAuth: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  updateLastActivity: () => void;
  
  // MFA
  setupMFA: (secret: string, code: string) => Promise<boolean>;
  verifyMFA: (code: string) => Promise<boolean>;
  
  // Error handling
  clearError: () => void;
  
  // Permissions
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  
  // User management
  updateProfile: (profile: Partial<User['profile']>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

type AuthStore = AuthState & AuthActions;

const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const useSecureAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    user: null,
    sessionExpiry: null,
    lastActivity: Date.now(),
    isDemoMode: false,
    requiresMFA: false,
    mfaSetupRequired: false,
    error: null,

    // Initialize authentication
    initializeAuth: async () => {
      set({ isLoading: true });
      
      try {
        const isAuthenticated = await secureAuth.isAuthenticated();
        
        if (isAuthenticated) {
          // Get user data from server
          const response = await secureAuth.authenticatedFetch('/api/auth/user');
          
          if (response.ok) {
            const userData = await response.json();
            set({
              isAuthenticated: true,
              user: userData.user,
              isDemoMode: userData.is_demo || false,
              sessionExpiry: userData.session_expiry,
              isInitialized: true,
              isLoading: false,
            });
            
            // Start session monitoring
            get().startSessionMonitoring();
          } else {
            set({
              isAuthenticated: false,
              user: null,
              isInitialized: true,
              isLoading: false,
            });
          }
        } else {
          set({
            isAuthenticated: false,
            user: null,
            isInitialized: true,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        set({
          isAuthenticated: false,
          user: null,
          isInitialized: true,
          isLoading: false,
          error: 'Failed to initialize authentication',
        });
      }
    },

    // Login with credentials
    login: async (email: string, password: string, mfaCode?: string) => {
      set({ isLoading: true, error: null });

      try {
        const result = await secureAuth.login(email, password, mfaCode);

        if (result.success && result.user) {
          set({
            isAuthenticated: true,
            user: result.user,
            isDemoMode: false,
            requiresMFA: false,
            mfaSetupRequired: result.user.mfaSetupRequired || false,
            lastActivity: Date.now(),
            isLoading: false,
          });
          
          get().startSessionMonitoring();
          return true;
        } else if (result.requiresMFA) {
          set({
            requiresMFA: true,
            isLoading: false,
            error: result.error || null,
          });
          return false;
        } else {
          set({
            error: result.error || 'Login failed',
            isLoading: false,
          });
          return false;
        }
      } catch (error) {
        console.error('Login error:', error);
        set({
          error: 'Network error during login',
          isLoading: false,
        });
        return false;
      }
    },

    // Demo login
    demoLogin: async (userType: string) => {
      set({ isLoading: true, error: null });

      try {
        const result = await secureAuth.demoLogin(userType);

        if (result.success && result.user) {
          set({
            isAuthenticated: true,
            user: result.user,
            isDemoMode: true,
            requiresMFA: false,
            lastActivity: Date.now(),
            isLoading: false,
          });
          
          get().startSessionMonitoring();
          return true;
        } else {
          set({
            error: result.error || 'Demo login failed',
            isLoading: false,
          });
          return false;
        }
      } catch (error) {
        console.error('Demo login error:', error);
        set({
          error: 'Network error during demo login',
          isLoading: false,
        });
        return false;
      }
    },

    // Logout
    logout: async () => {
      set({ isLoading: true });
      
      try {
        await secureAuth.logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
      
      // Clear state regardless of API call success
      set({
        isAuthenticated: false,
        user: null,
        sessionExpiry: null,
        isDemoMode: false,
        requiresMFA: false,
        mfaSetupRequired: false,
        error: null,
        isLoading: false,
      });
      
      // Stop session monitoring
      get().stopSessionMonitoring();
    },

    // Check session validity
    checkSession: async () => {
      try {
        const isValid = await secureAuth.isAuthenticated();
        
        if (!isValid && get().isAuthenticated) {
          // Session expired, logout user
          set({
            isAuthenticated: false,
            user: null,
            error: 'Your session has expired. Please log in again.',
          });
          get().stopSessionMonitoring();
        }
        
        return isValid;
      } catch (error) {
        console.error('Session check failed:', error);
        return false;
      }
    },

    // Refresh session
    refreshSession: async () => {
      try {
        const response = await secureAuth.authenticatedFetch('/api/auth/refresh-session', {
          method: 'POST',
        });

        if (response.ok) {
          const data = await response.json();
          set({
            sessionExpiry: data.session_expiry,
            lastActivity: Date.now(),
          });
          return true;
        }
      } catch (error) {
        console.error('Session refresh failed:', error);
      }
      
      return false;
    },

    // Update last activity
    updateLastActivity: () => {
      set({ lastActivity: Date.now() });
    },

    // MFA setup
    setupMFA: async (secret: string, code: string) => {
      try {
        const response = await secureAuth.authenticatedFetch('/api/auth/setup-mfa', {
          method: 'POST',
          body: JSON.stringify({ secret, code }),
        });

        if (response.ok) {
          const data = await response.json();
          set((state) => ({
            user: state.user ? { ...state.user, mfaEnabled: true } : null,
            mfaSetupRequired: false,
          }));
          return true;
        }
      } catch (error) {
        console.error('MFA setup failed:', error);
      }
      
      return false;
    },

    // MFA verification
    verifyMFA: async (code: string) => {
      try {
        const result = await secureAuth.login('', '', code);
        
        if (result.success) {
          set({
            requiresMFA: false,
            isAuthenticated: true,
            user: result.user,
          });
          return true;
        }
      } catch (error) {
        console.error('MFA verification failed:', error);
      }
      
      return false;
    },

    // Clear error
    clearError: () => set({ error: null }),

    // Permission checks
    hasPermission: (permission: string) => {
      const user = get().user;
      return user?.permissions?.includes(permission) || false;
    },

    hasAnyPermission: (permissions: string[]) => {
      const user = get().user;
      return permissions.some(permission => 
        user?.permissions?.includes(permission)
      );
    },

    // Update profile
    updateProfile: async (profileUpdate: Partial<User['profile']>) => {
      try {
        const response = await secureAuth.authenticatedFetch('/api/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify(profileUpdate),
        });

        if (response.ok) {
          const data = await response.json();
          set((state) => ({
            user: state.user ? {
              ...state.user,
              profile: { ...state.user.profile, ...data.profile }
            } : null,
          }));
          return true;
        }
      } catch (error) {
        console.error('Profile update failed:', error);
      }
      
      return false;
    },

    // Change password
    changePassword: async (currentPassword: string, newPassword: string) => {
      try {
        const response = await secureAuth.authenticatedFetch('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });

        return response.ok;
      } catch (error) {
        console.error('Password change failed:', error);
        return false;
      }
    },

    // Session monitoring (private methods)
    sessionInterval: null as NodeJS.Timeout | null,

    startSessionMonitoring: () => {
      const state = get();
      
      // Clear existing interval
      if (state.sessionInterval) {
        clearInterval(state.sessionInterval);
      }

      // Start new monitoring
      const interval = setInterval(async () => {
        const currentState = get();
        
        if (!currentState.isAuthenticated) {
          clearInterval(interval);
          return;
        }

        // Check if user has been inactive too long
        const inactiveTime = Date.now() - currentState.lastActivity;
        if (inactiveTime > ACTIVITY_TIMEOUT) {
          await currentState.logout();
          return;
        }

        // Check session validity
        const isValid = await currentState.checkSession();
        if (!isValid) {
          await currentState.logout();
        }
      }, SESSION_CHECK_INTERVAL);

      set({ sessionInterval: interval });
    },

    stopSessionMonitoring: () => {
      const interval = get().sessionInterval;
      if (interval) {
        clearInterval(interval);
        set({ sessionInterval: null });
      }
    },
  }))
);

// Activity tracking
if (typeof window !== 'undefined') {
  const trackActivity = () => {
    const store = useSecureAuthStore.getState();
    if (store.isAuthenticated) {
      store.updateLastActivity();
    }
  };

  // Track user activity
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, trackActivity, { passive: true });
  });
}