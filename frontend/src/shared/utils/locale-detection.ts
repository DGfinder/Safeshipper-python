// Locale detection and smart defaults utility
// Provides intelligent default configuration based on user location and preferences

// Global timezone groups for better UX
export const TIMEZONE_GROUPS = {
  'Americas': [
    { value: 'America/New_York', label: 'Eastern Time (New York)', region: 'North America' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)', region: 'North America' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)', region: 'North America' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', region: 'North America' },
    { value: 'America/Toronto', label: 'Eastern Time (Toronto)', region: 'North America' },
    { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', region: 'North America' },
    { value: 'America/Mexico_City', label: 'Central Time (Mexico City)', region: 'North America' },
    { value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)', region: 'South America' },
    { value: 'America/Buenos_Aires', label: 'Argentina Time (Buenos Aires)', region: 'South America' },
  ],
  'Europe & Africa': [
    { value: 'Europe/London', label: 'Greenwich Mean Time (London)', region: 'Europe' },
    { value: 'Europe/Paris', label: 'Central European Time (Paris)', region: 'Europe' },
    { value: 'Europe/Berlin', label: 'Central European Time (Berlin)', region: 'Europe' },
    { value: 'Europe/Amsterdam', label: 'Central European Time (Amsterdam)', region: 'Europe' },
    { value: 'Europe/Rome', label: 'Central European Time (Rome)', region: 'Europe' },
    { value: 'Europe/Madrid', label: 'Central European Time (Madrid)', region: 'Europe' },
    { value: 'Europe/Moscow', label: 'Moscow Standard Time (Moscow)', region: 'Europe' },
    { value: 'Africa/Cairo', label: 'Eastern European Time (Cairo)', region: 'Africa' },
    { value: 'Africa/Johannesburg', label: 'South Africa Standard Time (Johannesburg)', region: 'Africa' },
  ],
  'Asia Pacific': [
    { value: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)', region: 'Middle East' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (Mumbai)', region: 'Asia' },
    { value: 'Asia/Singapore', label: 'Singapore Standard Time (Singapore)', region: 'Asia' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (Hong Kong)', region: 'Asia' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)', region: 'Asia' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)', region: 'Asia' },
    { value: 'Australia/Perth', label: 'Western Standard Time (Perth)', region: 'Australia' },
    { value: 'Australia/Adelaide', label: 'Central Standard Time (Adelaide)', region: 'Australia' },
    { value: 'Australia/Darwin', label: 'Central Standard Time (Darwin)', region: 'Australia' },
    { value: 'Australia/Brisbane', label: 'Eastern Standard Time (Brisbane)', region: 'Australia' },
    { value: 'Australia/Sydney', label: 'Eastern Standard Time (Sydney)', region: 'Australia' },
    { value: 'Australia/Melbourne', label: 'Eastern Standard Time (Melbourne)', region: 'Australia' },
    { value: 'Pacific/Auckland', label: 'New Zealand Standard Time (Auckland)', region: 'New Zealand' },
  ],
} as const;

// Flatten all timezones for easy searching
export const ALL_TIMEZONES = Object.values(TIMEZONE_GROUPS).flat();

// Date format options for different regions
export const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (European/Australian)', regions: ['Europe', 'Australia', 'Africa'] },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)', regions: ['North America'] },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO Standard)', regions: ['Global'] },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY (e.g., 15 Jan 2024)', regions: ['Global'] },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', regions: ['Global'] },
] as const;

// Currency options for different regions
export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar ($)', regions: ['North America', 'Global'] },
  { value: 'EUR', label: 'Euro (€)', regions: ['Europe'] },
  { value: 'GBP', label: 'British Pound (£)', regions: ['Europe'] },
  { value: 'CAD', label: 'Canadian Dollar (C$)', regions: ['North America'] },
  { value: 'AUD', label: 'Australian Dollar (A$)', regions: ['Australia'] },
  { value: 'JPY', label: 'Japanese Yen (¥)', regions: ['Asia'] },
  { value: 'CNY', label: 'Chinese Yuan (¥)', regions: ['Asia'] },
  { value: 'SGD', label: 'Singapore Dollar (S$)', regions: ['Asia'] },
  { value: 'INR', label: 'Indian Rupee (₹)', regions: ['Asia'] },
  { value: 'AED', label: 'UAE Dirham (د.إ)', regions: ['Middle East'] },
  { value: 'ZAR', label: 'South African Rand (R)', regions: ['Africa'] },
  { value: 'BRL', label: 'Brazilian Real (R$)', regions: ['South America'] },
  { value: 'MXN', label: 'Mexican Peso ($)', regions: ['North America'] },
] as const;

// Regional defaults for different geographic areas
export const REGIONAL_DEFAULTS = {
  'North America': {
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    measurementUnit: 'imperial' as const,
    numberFormat: 'US' as const,
    timeFormat: '12h' as const,
    businessHours: { start: '09:00', end: '17:00' },
  },
  'Europe': {
    timezone: 'Europe/London',
    dateFormat: 'DD/MM/YYYY',
    currency: 'EUR',
    measurementUnit: 'metric' as const,
    numberFormat: 'European' as const,
    timeFormat: '24h' as const,
    businessHours: { start: '09:00', end: '17:00' },
  },
  'Australia': {
    timezone: 'Australia/Sydney',
    dateFormat: 'DD/MM/YYYY',
    currency: 'AUD',
    measurementUnit: 'metric' as const,
    numberFormat: 'Australian' as const,
    timeFormat: '24h' as const,
    businessHours: { start: '08:00', end: '17:00' },
  },
  'Asia': {
    timezone: 'Asia/Singapore',
    dateFormat: 'DD/MM/YYYY',
    currency: 'USD',
    measurementUnit: 'metric' as const,
    numberFormat: 'International' as const,
    timeFormat: '24h' as const,
    businessHours: { start: '09:00', end: '18:00' },
  },
  'Global': {
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    currency: 'USD',
    measurementUnit: 'metric' as const,
    numberFormat: 'International' as const,
    timeFormat: '24h' as const,
    businessHours: { start: '09:00', end: '17:00' },
  },
} as const;

// Industry-specific settings templates
export const INDUSTRY_TEMPLATES = {
  'logistics': {
    name: 'General Logistics',
    notifications: {
      weatherWarnings: true,
      routeUpdates: true,
      trafficAlerts: true,
      deliveryAlerts: true,
    },
    compliance: {
      basicSafety: true,
      vehicleInspections: true,
      driverLicensing: true,
    },
    operatingHours: 'standard', // 8am-6pm
  },
  'dangerous-goods': {
    name: 'Dangerous Goods Transport',
    notifications: {
      weatherWarnings: true,
      routeUpdates: true,
      emergencyAlerts: true,
      complianceAlerts: true,
      hazmatAlerts: true,
    },
    compliance: {
      dangerousGoodsLicense: true,
      hazmatCertification: true,
      emergencyResponse: true,
      specializedTraining: true,
    },
    operatingHours: 'extended', // 24/7 operations
  },
  'mining': {
    name: 'Mining & Resources',
    notifications: {
      weatherWarnings: true,
      extremeConditionAlerts: true,
      safetyAlerts: true,
      equipmentAlerts: true,
    },
    compliance: {
      heavyVehicleLicense: true,
      mineStandardsCompliance: true,
      fatigueManagement: true,
      environmentalCompliance: true,
    },
    operatingHours: 'continuous', // 24/7 shift operations
  },
  'cold-chain': {
    name: 'Cold Chain Logistics',
    notifications: {
      temperatureAlerts: true,
      equipmentAlerts: true,
      routeUpdates: true,
      qualityAlerts: true,
    },
    compliance: {
      temperatureLogging: true,
      foodSafety: true,
      qualityStandards: true,
    },
    operatingHours: 'standard',
  },
  'last-mile': {
    name: 'Last Mile Delivery',
    notifications: {
      trafficAlerts: true,
      deliveryUpdates: true,
      customerNotifications: true,
      routeOptimization: true,
    },
    compliance: {
      urbanDeliveryPermits: true,
      environmentalZones: true,
      customerService: true,
    },
    operatingHours: 'flexible', // Variable delivery windows
  },
} as const;

// Locale detection utilities
export class LocaleDetector {
  // Detect user's timezone
  static detectTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }

  // Detect user's locale
  static detectLocale(): string {
    try {
      return navigator.language || navigator.languages?.[0] || 'en-US';
    } catch {
      return 'en-US';
    }
  }

  // Detect user's region from timezone
  static detectRegion(timezone?: string): keyof typeof REGIONAL_DEFAULTS {
    const tz = timezone || this.detectTimezone();
    
    if (tz.startsWith('America/')) {
      return 'North America';
    } else if (tz.startsWith('Europe/') || tz.startsWith('Africa/')) {
      return 'Europe';
    } else if (tz.startsWith('Australia/') || tz.startsWith('Pacific/Auckland')) {
      return 'Australia';
    } else if (tz.startsWith('Asia/')) {
      return 'Asia';
    }
    
    return 'Global';
  }

  // Get smart defaults based on detected location
  static getSmartDefaults() {
    const timezone = this.detectTimezone();
    const locale = this.detectLocale();
    const region = this.detectRegion(timezone);
    const defaults = REGIONAL_DEFAULTS[region];

    // Use detected timezone if available, otherwise fall back to regional default
    const detectedTimezone = ALL_TIMEZONES.find(tz => tz.value === timezone)?.value || defaults.timezone;

    return {
      ...defaults,
      timezone: detectedTimezone,
      detectedLocale: locale,
      detectedRegion: region,
    };
  }

  // Get currency based on locale
  static getCurrencyFromLocale(locale: string): string {
    const currencyMap: Record<string, string> = {
      'en-US': 'USD',
      'en-CA': 'CAD',
      'en-GB': 'GBP',
      'en-AU': 'AUD',
      'en-NZ': 'NZD',
      'en-SG': 'SGD',
      'en-IN': 'INR',
      'zh-CN': 'CNY',
      'ja-JP': 'JPY',
      'ko-KR': 'KRW',
      'ar-AE': 'AED',
      'pt-BR': 'BRL',
      'es-MX': 'MXN',
      'fr-FR': 'EUR',
      'de-DE': 'EUR',
      'it-IT': 'EUR',
      'es-ES': 'EUR',
      'nl-NL': 'EUR',
    };

    return currencyMap[locale] || currencyMap[locale.split('-')[0]] || 'USD';
  }

  // Get date format preference from locale
  static getDateFormatFromLocale(locale: string): string {
    const region = locale.split('-')[1];
    
    if (region === 'US') {
      return 'MM/DD/YYYY';
    } else if (['GB', 'AU', 'NZ', 'ZA'].includes(region || '')) {
      return 'DD/MM/YYYY';
    } else if (['CA', 'SE', 'NO', 'DK', 'FI'].includes(region || '')) {
      return 'YYYY-MM-DD';
    }
    
    return 'DD/MM/YYYY'; // Default to European format
  }

  // Get measurement unit preference from locale
  static getMeasurementFromLocale(locale: string): 'metric' | 'imperial' {
    const imperialCountries = ['US', 'LR', 'MM']; // US, Liberia, Myanmar
    const region = locale.split('-')[1];
    
    return imperialCountries.includes(region || '') ? 'imperial' : 'metric';
  }

  // Format example date for preview
  static formatExampleDate(format: string, locale?: string): string {
    const now = new Date();
    const detectedLocale = locale || this.detectLocale();
    
    try {
      switch (format) {
        case 'DD/MM/YYYY':
          return now.toLocaleDateString('en-GB');
        case 'MM/DD/YYYY':
          return now.toLocaleDateString('en-US');
        case 'YYYY-MM-DD':
          return now.toISOString().split('T')[0];
        case 'DD MMM YYYY':
          return now.toLocaleDateString(detectedLocale, { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          });
        case 'DD-MM-YYYY':
          return now.toLocaleDateString('en-GB').replace(/\//g, '-');
        default:
          return now.toLocaleDateString();
      }
    } catch {
      return now.toLocaleDateString();
    }
  }
}

// Settings utilities for global deployment
export const settingsUtils = {
  // Get display value for timezone
  getTimezoneDisplay: (timezone: string) => {
    const tz = ALL_TIMEZONES.find(t => t.value === timezone);
    return tz?.label || timezone;
  },

  // Get display value for date format with example
  getDateFormatDisplay: (format: string) => {
    const fmt = DATE_FORMAT_OPTIONS.find(f => f.value === format);
    const example = LocaleDetector.formatExampleDate(format);
    return fmt ? `${fmt.label} - ${example}` : `${format} - ${example}`;
  },

  // Get currency display
  getCurrencyDisplay: (currency: string) => {
    const curr = CURRENCY_OPTIONS.find(c => c.value === currency);
    return curr?.label || currency;
  },

  // Get recommended settings for industry
  getIndustryRecommendations: (industry: keyof typeof INDUSTRY_TEMPLATES) => {
    return INDUSTRY_TEMPLATES[industry];
  },

  // Validate settings compatibility across regions
  validateGlobalCompatibility: (settings: any) => {
    const warnings: string[] = [];
    
    // Check timezone and currency compatibility
    const timezone = settings.timezone || '';
    const currency = settings.currency || '';
    const region = LocaleDetector.detectRegion(timezone);
    
    const currencyOption = CURRENCY_OPTIONS.find(c => c.value === currency);
    if (currencyOption && !currencyOption.regions.includes(region) && !currencyOption.regions.includes('Global')) {
      warnings.push(`Currency ${currency} may not be common in ${region}`);
    }
    
    return warnings;
  },
};