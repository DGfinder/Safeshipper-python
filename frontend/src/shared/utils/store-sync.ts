// Store synchronization utilities
// Handles synchronization between auth store and settings store

import { useSettingsStore } from "@/shared/stores/settings-store";
import { LocaleDetector, INDUSTRY_TEMPLATES } from "@/shared/utils/locale-detection";

// Sync user profile data to settings store
export const syncUserToSettings = (user: any) => {
  if (!user) return;

  const { updateProfile } = useSettingsStore.getState();

  // Update profile settings with user data
  updateProfile({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    phone: user.phone || "",
    timezone: user.timezone || LocaleDetector.detectTimezone(), // Auto-detect timezone
    language: user.language || "en",
  });
};

// Sync settings profile data back to auth store (if needed)
export const syncSettingsToUser = (profile: any, updateUserCallback: (updates: any) => void) => {
  if (!profile) return;

  updateUserCallback({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    timezone: profile.timezone,
    language: profile.language,
  });
};

// Initialize settings based on user role and preferences
export const initializeRoleBasedSettings = (userRole: string, industry?: keyof typeof INDUSTRY_TEMPLATES) => {
  const { updateNotifications, updateSystem, updateSecurity, updateCompliance } = useSettingsStore.getState();
  
  // Get industry-specific defaults if available
  const industryDefaults = industry ? INDUSTRY_TEMPLATES[industry] : null;

  switch (userRole) {
    case 'DRIVER':
      // Driver-specific default settings
      updateNotifications({
        categories: {
          shipmentUpdates: true,
          inspectionAlerts: true,
          complianceAlerts: true,
          systemMaintenance: false,
          emergencyAlerts: true,
          demurrageAlerts: false, // Drivers don't handle demurrage
          weatherWarnings: true,
          routeUpdates: true,
        },
        quietHours: {
          enabled: true,
          start: "22:00",
          end: "05:00", // Earlier start for drivers
        },
      });
      
      updateSystem({
        dashboard: {
          compactMode: true, // Compact for mobile use
          showTips: true,
          autoHideNotifications: true,
          defaultView: "list",
        },
      });

      updateSecurity({
        sessionTimeout: 720, // 12 hours for long shifts
      });
      
      break;

    case 'DISPATCHER':
      updateNotifications({
        categories: {
          shipmentUpdates: true,
          inspectionAlerts: true,
          complianceAlerts: true,
          systemMaintenance: true,
          emergencyAlerts: true,
          demurrageAlerts: true,
          weatherWarnings: true,
          routeUpdates: true,
        },
      });
      
      updateSystem({
        autoRefresh: true,
        refreshInterval: 15, // More frequent updates for dispatchers
        dashboard: {
          compactMode: false,
          showTips: false, // Experienced users
          autoHideNotifications: false,
          defaultView: "grid",
        },
      });
      
      break;

    case 'MANAGER':
    case 'ADMIN':
      updateNotifications({
        categories: {
          shipmentUpdates: true,
          inspectionAlerts: true,
          complianceAlerts: true,
          systemMaintenance: true,
          emergencyAlerts: true,
          demurrageAlerts: true,
          weatherWarnings: true,
          routeUpdates: false, // Less granular updates
        },
      });
      
      updateSecurity({
        twoFactorAuth: true, // Recommended for admin roles
        auditLog: true,
        dataEncryption: true,
      });
      
      break;

    case 'INSPECTOR':
      updateNotifications({
        categories: {
          shipmentUpdates: false,
          inspectionAlerts: true,
          complianceAlerts: true,
          systemMaintenance: false,
          emergencyAlerts: true,
          demurrageAlerts: false,
          weatherWarnings: false,
          routeUpdates: false,
        },
      });
      
      updateCompliance({
        dangerousGoodsLicense: true,
        auditSchedule: 'monthly',
        documentRetention: 7,
        enabledModules: industryDefaults?.compliance ? Object.keys(industryDefaults.compliance) : [],
      });
      
      break;

    default:
      // Default settings for any other roles
      break;
  }
};

// Handle user logout - clear sensitive settings but keep preferences
export const handleLogoutSettings = () => {
  const { updateSecurity, updateData } = useSettingsStore.getState();

  // Clear sensitive settings on logout
  updateSecurity({
    twoFactorAuth: false,
    deviceTrust: false,
    ipWhitelist: [],
  });

  // Disable sync while logged out
  updateData({
    syncEnabled: false,
  });
};

// Handle user login - restore settings and enable sync
export const handleLoginSettings = (user: any) => {
  const { updateData } = useSettingsStore.getState();

  // Sync user data to settings
  syncUserToSettings(user);

  // Initialize role-based settings with industry detection
  const detectedIndustry = user.industry || 'logistics'; // Default to general logistics
  initializeRoleBasedSettings(user.role, detectedIndustry as keyof typeof INDUSTRY_TEMPLATES);

  // Enable sync for logged-in users
  updateData({
    syncEnabled: true,
  });
};

// Get user-specific settings for export
export const getUserSettingsForExport = (userId: string) => {
  const state = useSettingsStore.getState();
  
  return {
    userId,
    profile: state.profile,
    notifications: state.notifications,
    system: state.system,
    // Don't export security settings for privacy
    demurrage: state.demurrage,
    data: state.data,
    compliance: state.compliance,
    exportedAt: new Date().toISOString(),
    version: state.version,
  };
};

// Validate imported settings for security
export const validateImportedSettings = (settings: any, currentUser: any) => {
  const errors: string[] = [];

  // Ensure the imported settings belong to the current user
  if (settings.userId && settings.userId !== currentUser.id) {
    errors.push("Settings belong to a different user");
  }

  // Validate role-specific settings
  if (settings.compliance && currentUser.role !== 'INSPECTOR' && currentUser.role !== 'ADMIN') {
    errors.push("Compliance settings can only be imported by inspectors and admins");
  }

  // Validate security settings
  if (settings.security && currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
    errors.push("Security settings can only be imported by administrators and managers");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};