import { useCallback } from 'react';
import { isDemoMode, isDemoActionAllowed, showDemoWarning } from '@/shared/config/environment';
import { useAuthStore } from '@/shared/stores/auth-store';

export interface DemoSecurityResult {
  isAllowed: boolean;
  warning?: string;
  isDemoMode: boolean;
}

export const useDemoSecurity = () => {
  const { checkSessionTimeout } = useAuthStore();

  const checkActionPermission = useCallback((action: string): DemoSecurityResult => {
    // Check if session has expired (checkSessionTimeout returns boolean)
    const sessionExpired = checkSessionTimeout();
    if (sessionExpired === true) {
      return {
        isAllowed: false,
        warning: 'Session has expired. Please log in again.',
        isDemoMode: isDemoMode()
      };
    }

    // In production mode, allow all actions (subject to user permissions)
    if (!isDemoMode()) {
      return {
        isAllowed: true,
        isDemoMode: false
      };
    }

    // In demo mode, check restrictions
    const allowed = isDemoActionAllowed(action);
    return {
      isAllowed: allowed,
      warning: allowed ? undefined : showDemoWarning(action),
      isDemoMode: true
    };
  }, [checkSessionTimeout]);

  const executeWithPermission = useCallback((
    action: string,
    callback: () => void,
    onRestricted?: (warning: string) => void
  ) => {
    const result = checkActionPermission(action);
    
    if (result.isAllowed) {
      callback();
    } else if (result.warning) {
      if (onRestricted) {
        onRestricted(result.warning);
      } else {
        // Default behavior - show alert
        alert(result.warning);
      }
    }
  }, [checkActionPermission]);

  return {
    checkActionPermission,
    executeWithPermission,
    isDemoMode: isDemoMode()
  };
};

export default useDemoSecurity;