import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { 
  ALL_TIMEZONES, 
  TIMEZONE_GROUPS,
  DATE_FORMAT_OPTIONS, 
  CURRENCY_OPTIONS,
  LocaleDetector,
  INDUSTRY_TEMPLATES,
  settingsUtils 
} from "@/shared/utils/locale-detection";

// Re-export for backward compatibility and easy access
export const GLOBAL_TIMEZONES = ALL_TIMEZONES;
export const TIMEZONE_GROUPS_EXPORT = TIMEZONE_GROUPS;
export const DATE_FORMATS = DATE_FORMAT_OPTIONS;
export const CURRENCIES = CURRENCY_OPTIONS;
export { settingsUtils };

// Settings interfaces
export interface ProfileSettings {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
  language: 'en' | 'fr';
  avatar?: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  categories: {
    shipmentUpdates: boolean;
    inspectionAlerts: boolean;
    complianceAlerts: boolean;
    systemMaintenance: boolean;
    emergencyAlerts: boolean;
    demurrageAlerts: boolean;
    weatherWarnings: boolean;
    routeUpdates: boolean;
  };
  priority: {
    low: boolean;
    medium: boolean;
    high: boolean;
    critical: boolean;
  };
  sound: {
    enabled: boolean;
    volume: number; // 0-100
    desktop: boolean;
    mobile: boolean;
  };
}

export interface SystemSettings {
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  theme: 'light' | 'dark' | 'system';
  defaultMapView: 'standard' | 'satellite' | 'terrain';
  measurementUnit: 'metric' | 'imperial';
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: 'US' | 'European' | 'Australian' | 'International';
  currency: string; // Support all global currencies
  language: 'en' | 'fr' | 'es' | 'de' | 'zh' | 'ja';
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'xlarge';
    screenReader: boolean;
  };
  dashboard: {
    compactMode: boolean;
    showTips: boolean;
    autoHideNotifications: boolean;
    defaultView: 'grid' | 'list';
  };
}

export interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number; // minutes
  loginNotifications: boolean;
  passwordExpiry: number; // days
  securityQuestions: boolean;
  deviceTrust: boolean;
  ipWhitelist: string[];
  auditLog: boolean;
  dataEncryption: boolean;
}

export interface DemurrageSettings {
  enableDemurrage: boolean;
  defaultRates: {
    standard: number;
    premium: number;
    hazmat: number;
    specialized: number;
  };
  freeTimeAllowance: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  gracePeriod: number; // hours
  autoCalculation: boolean;
  alertThresholds: {
    atRisk: number; // hours before demurrage
    accumulating: number; // hours after demurrage starts
  };
  currency: string;
  businessDays: boolean;
  weekendMultiplier: number;
  customRules: {
    hazmatWeekendSurcharge: boolean;
    bulkDiscount: number;
    newCustomerGracePeriod: number; // hours
    seasonalAdjustments: boolean;
    extremeWeatherAdjustment: boolean;
  };
  taxConfiguration: {
    taxIncluded: boolean;
    taxRate: number;
    taxType: string; // GST, VAT, Sales Tax, etc.
    invoicingStandard: 'Local' | 'International';
    paymentTerms: string;
  };
}

export interface DataSettings {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  dataRetention: number; // months
  exportFormat: 'json' | 'csv' | 'xlsx';
  syncEnabled: boolean;
  offlineMode: boolean;
  cacheSize: number; // MB
  compressionEnabled: boolean;
}

export interface ComplianceSettings {
  // Generic compliance modules - can be enabled based on region/industry
  dangerousGoodsLicense: boolean;
  heavyVehicleLicense: boolean;
  fatigueManagement: boolean;
  driverQualifications: boolean;
  vehicleInspections: boolean;
  safetyManagement: boolean;
  environmentalCompliance: boolean;
  crossBorderRequirements: boolean;
  industrySpecificCertifications: boolean;
  auditSchedule: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  documentRetention: number; // years
  
  // Configurable compliance modules based on region/industry
  enabledModules: string[]; // e.g., ['DOT', 'FMCSA', 'ADR', 'NHVR', etc.]
  customRequirements: {
    name: string;
    enabled: boolean;
    description: string;
  }[];
}

// Combined settings interface
export interface AppSettings {
  profile: ProfileSettings;
  notifications: NotificationSettings;
  system: SystemSettings;
  security: SecuritySettings;
  demurrage: DemurrageSettings;
  data: DataSettings;
  compliance: ComplianceSettings;
  lastUpdated: string;
  version: string;
}

// Settings actions interface
interface SettingsActions {
  updateProfile: (updates: Partial<ProfileSettings>) => void;
  updateNotifications: (updates: Partial<NotificationSettings>) => void;
  updateSystem: (updates: Partial<SystemSettings>) => void;
  updateSecurity: (updates: Partial<SecuritySettings>) => void;
  updateDemurrage: (updates: Partial<DemurrageSettings>) => void;
  updateData: (updates: Partial<DataSettings>) => void;
  updateCompliance: (updates: Partial<ComplianceSettings>) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  resetSection: (section: keyof Omit<AppSettings, 'lastUpdated' | 'version'>) => void;
  exportSettings: () => string;
  importSettings: (settings: string) => boolean;
  validateSettings: (settings: Partial<AppSettings>) => { valid: boolean; errors: string[] };
}

// Get smart defaults based on user's location and browser settings
function getSmartDefaults(): AppSettings {
  const smartDefaults = LocaleDetector.getSmartDefaults();
  
  return {
    profile: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      timezone: smartDefaults.timezone,
      language: (smartDefaults.detectedLocale.split('-')[0] === 'fr' ? 'fr' : 'en') as 'en' | 'fr',
    },
    notifications: {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    quietHours: {
      enabled: true,
      start: "22:00",
      end: "06:00",
    },
    categories: {
      shipmentUpdates: true,
      inspectionAlerts: true,
      complianceAlerts: true,
      systemMaintenance: false,
      emergencyAlerts: true,
      demurrageAlerts: true,
      weatherWarnings: true, // Important for severe weather
      routeUpdates: true,
    },
    priority: {
      low: true,
      medium: true,
      high: true,
      critical: true,
    },
    sound: {
      enabled: true,
      volume: 70,
      desktop: true,
      mobile: true,
    },
  },
  system: {
    autoRefresh: true,
    refreshInterval: 30,
    theme: "system",
    defaultMapView: "standard",
    measurementUnit: smartDefaults.measurementUnit,
    dateFormat: smartDefaults.dateFormat,
    timeFormat: smartDefaults.timeFormat,
    numberFormat: smartDefaults.numberFormat,
    currency: LocaleDetector.getCurrencyFromLocale(smartDefaults.detectedLocale),
    language: "en",
    accessibility: {
      reduceMotion: false,
      highContrast: false,
      fontSize: "medium",
      screenReader: false,
    },
    dashboard: {
      compactMode: false,
      showTips: true,
      autoHideNotifications: false,
      defaultView: "grid",
    },
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 480, // 8 hours for long shifts
    loginNotifications: true,
    passwordExpiry: 90,
    securityQuestions: false,
    deviceTrust: false,
    ipWhitelist: [],
    auditLog: true,
    dataEncryption: true,
  },
  demurrage: {
    enableDemurrage: true,
    defaultRates: {
      standard: 85,
      premium: 125,
      hazmat: 165,
      specialized: 145,
    },
    freeTimeAllowance: {
      bronze: 1,
      silver: 1,
      gold: 2,
      platinum: 3,
    },
    gracePeriod: 2,
    autoCalculation: true,
    alertThresholds: {
      atRisk: 6,
      accumulating: 0,
    },
    currency: smartDefaults.currency,
    businessDays: true,
    weekendMultiplier: 1.5,
    customRules: {
      hazmatWeekendSurcharge: true,
      bulkDiscount: 0.1,
      newCustomerGracePeriod: 24,
      seasonalAdjustments: true,
      extremeWeatherAdjustment: true,
    },
    taxConfiguration: {
      taxIncluded: smartDefaults.detectedRegion === 'Australia',
      taxRate: smartDefaults.detectedRegion === 'Europe' ? 0.20 : smartDefaults.detectedRegion === 'Australia' ? 0.10 : 0.08,
      taxType: smartDefaults.detectedRegion === 'Europe' ? 'VAT' : smartDefaults.detectedRegion === 'Australia' ? 'GST' : 'Sales Tax',
      invoicingStandard: smartDefaults.detectedRegion === 'Global' ? 'International' : 'Local',
      paymentTerms: "30 days",
    },
  },
  data: {
    autoBackup: true,
    backupFrequency: "daily",
    dataRetention: 84, // 7 years for compliance
    exportFormat: "xlsx",
    syncEnabled: true,
    offlineMode: false,
    cacheSize: 100,
    compressionEnabled: true,
  },
  compliance: {
    dangerousGoodsLicense: true,
    heavyVehicleLicense: true,
    fatigueManagement: true,
    driverQualifications: true,
    vehicleInspections: true,
    safetyManagement: true,
    environmentalCompliance: true,
    crossBorderRequirements: false,
    industrySpecificCertifications: false,
    auditSchedule: "quarterly",
    documentRetention: 7,
    enabledModules: [], // Will be populated based on region/industry
    customRequirements: [],
  },
  lastUpdated: new Date().toISOString(),
  version: "1.0.0",
};
}

// Create default settings
const defaultSettings = getSmartDefaults();

// Settings store type
type SettingsStore = AppSettings & SettingsActions;

// Create the settings store
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      updateProfile: (updates) => {
        set((state) => ({
          profile: { ...state.profile, ...updates },
          lastUpdated: new Date().toISOString(),
        }));
      },

      updateNotifications: (updates) => {
        set((state) => ({
          notifications: { ...state.notifications, ...updates },
          lastUpdated: new Date().toISOString(),
        }));
      },

      updateSystem: (updates) => {
        set((state) => ({
          system: { ...state.system, ...updates },
          lastUpdated: new Date().toISOString(),
        }));
      },

      updateSecurity: (updates) => {
        set((state) => ({
          security: { ...state.security, ...updates },
          lastUpdated: new Date().toISOString(),
        }));
      },

      updateDemurrage: (updates) => {
        set((state) => ({
          demurrage: { ...state.demurrage, ...updates },
          lastUpdated: new Date().toISOString(),
        }));
      },

      updateData: (updates) => {
        set((state) => ({
          data: { ...state.data, ...updates },
          lastUpdated: new Date().toISOString(),
        }));
      },

      updateCompliance: (updates) => {
        set((state) => ({
          compliance: { ...state.compliance, ...updates },
          lastUpdated: new Date().toISOString(),
        }));
      },

      updateSettings: (updates) => {
        set((state) => ({
          ...state,
          ...updates,
          lastUpdated: new Date().toISOString(),
        }));
      },

      resetSettings: () => {
        set({
          ...defaultSettings,
          lastUpdated: new Date().toISOString(),
        });
      },

      resetSection: (section) => {
        set((state) => ({
          ...state,
          [section]: defaultSettings[section],
          lastUpdated: new Date().toISOString(),
        }));
      },

      exportSettings: () => {
        const settings = get();
        const exportData = {
          profile: settings.profile,
          notifications: settings.notifications,
          system: settings.system,
          security: settings.security,
          demurrage: settings.demurrage,
          data: settings.data,
          compliance: settings.compliance,
          exportedAt: new Date().toISOString(),
          version: settings.version,
        };
        return JSON.stringify(exportData, null, 2);
      },

      importSettings: (settingsJson) => {
        try {
          const imported = JSON.parse(settingsJson);
          const validation = get().validateSettings(imported);
          
          if (!validation.valid) {
            console.error("Invalid settings:", validation.errors);
            return false;
          }

          set((state) => ({
            ...state,
            ...imported,
            lastUpdated: new Date().toISOString(),
          }));
          return true;
        } catch (error) {
          console.error("Failed to import settings:", error);
          return false;
        }
      },

      validateSettings: (settings) => {
        const errors: string[] = [];

        // Basic validation - can be extended with more sophisticated rules
        if (settings.profile?.email && !settings.profile.email.includes("@")) {
          errors.push("Invalid email format");
        }

        if (settings.security?.sessionTimeout && settings.security.sessionTimeout < 5) {
          errors.push("Session timeout must be at least 5 minutes");
        }

        if (settings.demurrage?.defaultRates?.standard && settings.demurrage.defaultRates.standard < 0) {
          errors.push("Demurrage rates cannot be negative");
        }

        return {
          valid: errors.length === 0,
          errors,
        };
      },
    }),
    {
      name: "safeshipper-settings-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profile: state.profile,
        notifications: state.notifications,
        system: state.system,
        security: state.security,
        demurrage: state.demurrage,
        data: state.data,
        compliance: state.compliance,
        lastUpdated: state.lastUpdated,
        version: state.version,
      }),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Handle settings migrations between versions
        if (version === 0) {
          // Migration from version 0 to 1
          return {
            ...defaultSettings,
            ...persistedState,
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
          };
        }
        return persistedState;
      },
    }
  )
);

// Settings utility functions
export const settingsStoreUtils = {
  // Get display value for timezone
  getTimezoneDisplay: (timezone: string) => {
    const tz = ALL_TIMEZONES.find(t => t.value === timezone);
    return tz?.label || timezone;
  },

  // Get display value for date format
  getDateFormatDisplay: (format: string) => {
    const fmt = DATE_FORMAT_OPTIONS.find(f => f.value === format);
    return fmt?.label || format;
  },

  // Format example date with current format
  getDateExample: (format: string) => {
    return LocaleDetector.formatExampleDate(format);
  },

  // Validate settings compatibility
  validateCompatibility: (settings: Partial<AppSettings>) => {
    const warnings: string[] = [];

    // Check for potential conflicts
    if (settings.system?.theme === "dark" && settings.system?.accessibility?.highContrast) {
      warnings.push("Dark theme with high contrast may reduce readability");
    }

    if (settings.notifications?.quietHours?.enabled && settings.notifications?.categories?.emergencyAlerts === false) {
      warnings.push("Emergency alerts disabled during quiet hours - consider enabling for safety");
    }

    return warnings;
  },
};