/**
 * Comprehensive Input Validation & Sanitization
 * Addresses security gaps in input handling to prevent injection attacks
 * Provides client-side validation with server-side equivalent patterns
 */

import DOMPurify from 'isomorphic-dompurify';

// Validation error interface
export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: any;
}

// Common validation patterns
export const ValidationPatterns = {
  // Email validation (RFC 5322 compliant)
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  // Strong password (8+ chars, uppercase, lowercase, digit, special char)
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  // Username (alphanumeric, underscore, hyphen, 3-30 chars)
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  
  // Phone number (international format)
  PHONE: /^\+?[1-9]\d{1,14}$/,
  
  // Dangerous goods UN number
  UN_NUMBER: /^UN\d{4}$/,
  
  // Hazchem code
  HAZCHEM_CODE: /^[1-4][SWYX]?[EFS]?$/,
  
  // Vehicle registration
  VEHICLE_REG: /^[A-Z0-9]{2,10}$/,
  
  // Shipment identifier
  SHIPMENT_ID: /^[A-Z]{2}-\d{4}-\d{6}$/,
  
  // Coordinates (latitude/longitude)
  LATITUDE: /^-?([1-8]?\d(\.\d+)?|90(\.0+)?)$/,
  LONGITUDE: /^-?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/,
  
  // SQL injection detection
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b|[';--]|\/\*|\*\/)/i,
  
  // XSS detection
  XSS_PATTERNS: /<[^>]*script[^>]*>|<[^>]*on\w+\s*=|javascript:|data:text\/html|vbscript:/i,
  
  // Path traversal
  PATH_TRAVERSAL: /(\.\.[\/\\]|\.\.%[0-9a-fA-F]{2})/,
  
  // File upload validation
  SAFE_FILENAME: /^[a-zA-Z0-9._-]+$/,
  IMAGE_EXTENSIONS: /\.(jpg|jpeg|png|gif|webp|svg)$/i,
  DOCUMENT_EXTENSIONS: /\.(pdf|doc|docx|xls|xlsx|txt|csv)$/i,
};

// Sanitization functions
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS
   */
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: [],
    });
  }

  /**
   * Sanitize plain text input
   */
  static sanitizeText(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/data:text\/html/gi, '') // Remove data URLs
      .trim();
  }

  /**
   * Sanitize SQL input to prevent injection
   */
  static sanitizeSQLInput(input: string): string {
    return input
      .replace(/[';--]/g, '') // Remove SQL comment patterns
      .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/gi, '')
      .replace(/[<>]/g, '');
  }

  /**
   * Sanitize file paths to prevent directory traversal
   */
  static sanitizeFilePath(input: string): string {
    return input
      .replace(/\.\.[\/\\]/g, '') // Remove directory traversal
      .replace(/[<>:"|?*]/g, '') // Remove invalid file characters
      .replace(/^[\/\\]/, '') // Remove leading slashes
      .trim();
  }

  /**
   * Sanitize coordinates
   */
  static sanitizeCoordinates(lat: string | number, lng: string | number): { lat: number; lng: number } | null {
    const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
    const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;

    if (isNaN(latNum) || isNaN(lngNum)) {
      return null;
    }

    // Clamp coordinates to valid ranges
    const clampedLat = Math.max(-90, Math.min(90, latNum));
    const clampedLng = Math.max(-180, Math.min(180, lngNum));

    return { lat: clampedLat, lng: clampedLng };
  }

  /**
   * Sanitize JSON input
   */
  static sanitizeJSON(input: string): any | null {
    try {
      const parsed = JSON.parse(input);
      return this.sanitizeObject(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Recursively sanitize object properties
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanKey = this.sanitizeText(key);
        sanitized[cleanKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}

// Main validator class
export class InputValidator {
  private errors: ValidationError[] = [];

  /**
   * Clear previous validation errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Add validation error
   */
  private addError(field: string, code: string, message: string, value?: any): void {
    this.errors.push({ field, code, message, value });
  }

  /**
   * Validate email address
   */
  validateEmail(email: string, field: string = 'email'): boolean {
    if (!email || typeof email !== 'string') {
      this.addError(field, 'REQUIRED', 'Email is required');
      return false;
    }

    const sanitized = InputSanitizer.sanitizeText(email);
    
    if (!ValidationPatterns.EMAIL.test(sanitized)) {
      this.addError(field, 'INVALID_FORMAT', 'Invalid email format', sanitized);
      return false;
    }

    if (sanitized.length > 254) {
      this.addError(field, 'TOO_LONG', 'Email address too long', sanitized);
      return false;
    }

    return true;
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string, field: string = 'password'): boolean {
    if (!password || typeof password !== 'string') {
      this.addError(field, 'REQUIRED', 'Password is required');
      return false;
    }

    if (password.length < 8) {
      this.addError(field, 'TOO_SHORT', 'Password must be at least 8 characters');
      return false;
    }

    if (password.length > 128) {
      this.addError(field, 'TOO_LONG', 'Password too long');
      return false;
    }

    if (!ValidationPatterns.STRONG_PASSWORD.test(password)) {
      this.addError(
        field,
        'WEAK_PASSWORD',
        'Password must contain uppercase, lowercase, digit, and special character'
      );
      return false;
    }

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'admin', 'qwerty'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      this.addError(field, 'COMMON_PASSWORD', 'Password contains common patterns');
      return false;
    }

    return true;
  }

  /**
   * Validate and sanitize dangerous goods data
   */
  validateDangerousGoods(data: {
    unNumber?: string;
    hazchemCode?: string;
    properShippingName?: string;
    hazardClass?: string;
    packingGroup?: string;
  }, field: string = 'dangerousGoods'): boolean {
    let isValid = true;

    if (data.unNumber) {
      const sanitized = InputSanitizer.sanitizeText(data.unNumber);
      if (!ValidationPatterns.UN_NUMBER.test(sanitized)) {
        this.addError(`${field}.unNumber`, 'INVALID_FORMAT', 'Invalid UN number format');
        isValid = false;
      }
    }

    if (data.hazchemCode) {
      const sanitized = InputSanitizer.sanitizeText(data.hazchemCode);
      if (!ValidationPatterns.HAZCHEM_CODE.test(sanitized)) {
        this.addError(`${field}.hazchemCode`, 'INVALID_FORMAT', 'Invalid Hazchem code format');
        isValid = false;
      }
    }

    if (data.properShippingName) {
      const sanitized = InputSanitizer.sanitizeText(data.properShippingName);
      if (sanitized.length < 3 || sanitized.length > 200) {
        this.addError(`${field}.properShippingName`, 'INVALID_LENGTH', 'Shipping name must be 3-200 characters');
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat: any, lng: any, field: string = 'coordinates'): boolean {
    const coords = InputSanitizer.sanitizeCoordinates(lat, lng);
    
    if (!coords) {
      this.addError(field, 'INVALID_FORMAT', 'Invalid coordinate format');
      return false;
    }

    if (!ValidationPatterns.LATITUDE.test(coords.lat.toString())) {
      this.addError(`${field}.latitude`, 'OUT_OF_RANGE', 'Latitude out of range (-90 to 90)');
      return false;
    }

    if (!ValidationPatterns.LONGITUDE.test(coords.lng.toString())) {
      this.addError(`${field}.longitude`, 'OUT_OF_RANGE', 'Longitude out of range (-180 to 180)');
      return false;
    }

    return true;
  }

  /**
   * Validate file upload
   */
  validateFile(
    file: File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: RegExp;
    } = {},
    field: string = 'file'
  ): boolean {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [], allowedExtensions } = options;

    if (!file) {
      this.addError(field, 'REQUIRED', 'File is required');
      return false;
    }

    // Validate file size
    if (file.size > maxSize) {
      this.addError(field, 'TOO_LARGE', `File size exceeds ${maxSize / 1024 / 1024}MB limit`);
      return false;
    }

    // Validate file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      this.addError(field, 'INVALID_TYPE', `File type ${file.type} not allowed`);
      return false;
    }

    // Validate file extension
    if (allowedExtensions && !allowedExtensions.test(file.name)) {
      this.addError(field, 'INVALID_EXTENSION', 'File extension not allowed');
      return false;
    }

    // Validate filename
    const sanitizedName = InputSanitizer.sanitizeFilePath(file.name);
    if (!ValidationPatterns.SAFE_FILENAME.test(sanitizedName)) {
      this.addError(field, 'INVALID_FILENAME', 'Filename contains invalid characters');
      return false;
    }

    return true;
  }

  /**
   * Detect potential security threats in input
   */
  detectSecurityThreats(input: string, field: string = 'input'): boolean {
    let hasThreat = false;

    // SQL injection detection
    if (ValidationPatterns.SQL_INJECTION.test(input)) {
      this.addError(field, 'SQL_INJECTION', 'Potential SQL injection detected');
      hasThreat = true;
    }

    // XSS detection
    if (ValidationPatterns.XSS_PATTERNS.test(input)) {
      this.addError(field, 'XSS_ATTEMPT', 'Potential XSS attack detected');
      hasThreat = true;
    }

    // Path traversal detection
    if (ValidationPatterns.PATH_TRAVERSAL.test(input)) {
      this.addError(field, 'PATH_TRAVERSAL', 'Path traversal attempt detected');
      hasThreat = true;
    }

    return !hasThreat;
  }

  /**
   * Comprehensive validation for shipment data
   */
  validateShipmentData(data: any): ValidationResult {
    this.clear();

    // Validate shipment ID
    if (data.id && !ValidationPatterns.SHIPMENT_ID.test(data.id)) {
      this.addError('id', 'INVALID_FORMAT', 'Invalid shipment ID format');
    }

    // Validate origin and destination
    if (data.origin) {
      const sanitized = InputSanitizer.sanitizeText(data.origin);
      if (sanitized.length < 2 || sanitized.length > 100) {
        this.addError('origin', 'INVALID_LENGTH', 'Origin must be 2-100 characters');
      }
    }

    if (data.destination) {
      const sanitized = InputSanitizer.sanitizeText(data.destination);
      if (sanitized.length < 2 || sanitized.length > 100) {
        this.addError('destination', 'INVALID_LENGTH', 'Destination must be 2-100 characters');
      }
    }

    // Validate dangerous goods
    if (data.dangerousGoods) {
      this.validateDangerousGoods(data.dangerousGoods);
    }

    // Security threat detection
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        this.detectSecurityThreats(value, key);
      }
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      sanitizedData: InputSanitizer.sanitizeObject(data),
    };
  }

  /**
   * Get validation results
   */
  getResults(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
    };
  }
}

// Export singleton validator instance
export const validator = new InputValidator();

// Utility functions for quick validation
export const validateEmail = (email: string): boolean => {
  validator.clear();
  return validator.validateEmail(email);
};

export const validatePassword = (password: string): boolean => {
  validator.clear();
  return validator.validatePassword(password);
};

export const sanitizeInput = (input: string): string => {
  return InputSanitizer.sanitizeText(input);
};

export const sanitizeHTML = (html: string): string => {
  return InputSanitizer.sanitizeHTML(html);
};

export default InputValidator;