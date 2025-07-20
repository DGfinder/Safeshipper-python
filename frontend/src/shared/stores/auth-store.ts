import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { validateDemoCredentials, validateCustomerCredentials, DemoUser } from "@/shared/config/demo-users";
import { getEnvironmentConfig, isDemoMode, isDemoSessionExpired, getDemoSessionTimeout } from "@/shared/config/environment";

interface User {
  id: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  department?: string;
  permissions?: string[];
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
  loginTime: number | null;
  sessionTimeout: NodeJS.Timeout | null;
  login: (userData: Partial<User>) => void;
  loginWithCredentials: (email: string, password: string) => Promise<any>;
  loginWithMFA: (
    tempToken: string,
    deviceId: string,
    code: string,
  ) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setHydrated: (hydrated: boolean) => void;
  getToken: () => string | null;
  clearMFAState: () => void;
  syncUserToSettings: () => void;
  checkSessionTimeout: () => boolean;
  setupDemoSessionTimeout: () => void;
  clearSessionTimeout: () => void;
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
      loginTime: null,
      sessionTimeout: null,

      // Simple login for demo mode
      login: (userData: Partial<User>) => {
        const user: User = {
          id: userData.id || 'demo-user',
          username: userData.username || userData.email,
          email: userData.email || '',
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || 'USER',
          department: userData.department,
          permissions: userData.permissions || [],
          avatar: userData.avatar || (userData.firstName && userData.lastName ? 
            `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`.toUpperCase() : 
            userData.email?.substring(0, 2).toUpperCase() || 'U'),
        };

        // Store demo token
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", "demo_token");
          localStorage.setItem("refresh_token", "demo_refresh_token");
        }

        const loginTime = Date.now();
        
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          token: "demo_token",
          requiresMFA: false,
          loginTime,
        });

        // Setup demo session timeout if in demo mode
        if (isDemoMode()) {
          get().setupDemoSessionTimeout();
        }

        // Sync user data to settings store
        setTimeout(() => {
          get().syncUserToSettings();
        }, 100);
      },

      // Full login with credentials (for production)
      loginWithCredentials: async (email: string, password: string) => {
        set({ isLoading: true, requiresMFA: false });
        const config = getEnvironmentConfig();

        try {
          // In demo mode, use demo credentials
          if (config.apiMode === 'demo') {
            // Check demo credentials
            const demoUser = validateDemoCredentials(email, password);
            const customerUser = validateCustomerCredentials(email, password);
            
            if (demoUser) {
              get().login({
                id: demoUser.id,
                email: demoUser.email,
                firstName: demoUser.firstName,
                lastName: demoUser.lastName,
                role: demoUser.role,
                department: demoUser.department,
                permissions: demoUser.permissions,
              });
              return { requiresMFA: false, user: demoUser };
            } else if (customerUser) {
              get().login({
                id: `customer-${customerUser.email}`,
                email: customerUser.email,
                firstName: customerUser.name.split(' ')[0],
                lastName: customerUser.name.split(' ').slice(1).join(' '),
                role: 'CUSTOMER',
                department: customerUser.category,
                permissions: ['customer_portal'],
              });
              return { requiresMFA: false, user: customerUser };
            } else {
              throw new Error('Invalid demo credentials');
            }
          }

          // Production API call
          const response = await fetch("/api/v1/auth/mfa/challenge/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username: email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Login failed");
          }

          const data = await response.json();

          if (data.requires_mfa) {
            // User requires MFA verification
            set({
              isLoading: false,
              requiresMFA: true,
              tempToken: data.temp_token,
              availableMFAMethods: data.available_methods,
            });
            return {
              requiresMFA: true,
              availableMethods: data.available_methods,
            };
          } else {
            // No MFA required, complete login
            if (typeof window !== "undefined") {
              localStorage.setItem("access_token", data.access_token);
              localStorage.setItem("refresh_token", data.refresh_token);
            }

            const user: User = {
              id: data.user.id.toString(),
              username: data.user.username,
              email: data.user.email,
              role: data.user.role,
              avatar: data.user.username.substring(0, 2).toUpperCase(),
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              token: data.access_token,
              requiresMFA: false,
            });

            return { requiresMFA: false, user };
          }
        } catch (error) {
          set({ isLoading: false, requiresMFA: false });
          throw error;
        }
      },

      loginWithMFA: async (
        tempToken: string,
        deviceId: string,
        code: string,
      ) => {
        set({ isLoading: true });

        try {
          const response = await fetch("/api/v1/auth/mfa/verify-login/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              temp_token: tempToken,
              device_id: deviceId,
              code,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "MFA verification failed");
          }

          const data = await response.json();

          // Store tokens
          if (typeof window !== "undefined") {
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("refresh_token", data.refresh_token);
          }

          const user: User = {
            id: data.user.id.toString(),
            username: data.user.username,
            email: data.user.email,
            role: data.user.role,
            avatar: data.user.username.substring(0, 2).toUpperCase(),
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            token: data.access_token,
            requiresMFA: false,
            tempToken: null,
            availableMFAMethods: [],
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          if (typeof window !== "undefined") {
            const refreshToken = localStorage.getItem("refresh_token");

            // Call backend logout endpoint
            await fetch("/api/v1/users/auth/logout/", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
          }
        } catch (error) {
          console.warn("Logout API call failed:", error);
        } finally {
          // Clear local storage and state regardless of API call result
          if (typeof window !== "undefined") {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
          }

          // Clear sensitive settings before logging out
          if (typeof window !== "undefined") {
            import("@/shared/utils/store-sync").then(({ handleLogoutSettings }) => {
              handleLogoutSettings();
            });
          }

          set({
            user: null,
            isAuthenticated: false,
            token: null,
            requiresMFA: false,
            tempToken: null,
            availableMFAMethods: [],
            loginTime: null,
          });

          // Clear session timeout
          get().clearSessionTimeout();
        }
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },

      getToken: () => {
        if (typeof window === "undefined") return null;
        return get().token || localStorage.getItem("access_token");
      },

      clearMFAState: () => {
        set({
          requiresMFA: false,
          tempToken: null,
          availableMFAMethods: [],
        });
      },

      syncUserToSettings: () => {
        const state = get();
        if (state.user && typeof window !== "undefined") {
          // Import sync utilities dynamically to avoid circular dependency
          import("@/shared/utils/store-sync").then(({ handleLoginSettings }) => {
            handleLoginSettings(state.user);
          });
        }
      },

      // Demo session timeout management
      setupDemoSessionTimeout: () => {
        if (!isDemoMode()) return;
        
        const timeoutDuration = getDemoSessionTimeout();
        const timeout = setTimeout(() => {
          const state = get();
          if (state.loginTime && isDemoSessionExpired(state.loginTime)) {
            console.warn('Demo session expired. Logging out...');
            get().logout();
            
            // Show user-friendly message
            if (typeof window !== "undefined") {
              alert('Your demo session has expired. Please log in again.');
            }
          }
        }, timeoutDuration);
        
        set({ sessionTimeout: timeout });
      },

      clearSessionTimeout: () => {
        const state = get();
        if (state.sessionTimeout) {
          clearTimeout(state.sessionTimeout);
          set({ sessionTimeout: null });
        }
      },

      checkSessionTimeout: () => {
        const state = get();
        if (isDemoMode() && state.loginTime && isDemoSessionExpired(state.loginTime)) {
          console.warn('Demo session expired during check. Logging out...');
          get().logout();
          return true; // Session expired
        }
        return false; // Session still valid
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        loginTime: state.loginTime,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
