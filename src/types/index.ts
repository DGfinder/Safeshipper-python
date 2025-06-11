// Core SafeShipper TypeScript Interfaces

// ============ USER MANAGEMENT ============
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  status: 'active' | 'inactive' | 'suspended'
  avatar?: string
  phone?: string
  company: Company
  permissions: Permission[]
  createdAt: Date
  lastLogin?: Date
}

export interface Company {
  id: string
  name: string
  abn: string
  address: Address
  contactEmail: string
  contactPhone: string
  logo?: string
  subscription: 'basic' | 'professional' | 'enterprise'
  settings: CompanySettings
}

export interface Address {
  street: string
  city: string
  state: string
  postcode: string
  country: string
}

export type UserRole = 
  | 'admin'           // Full system access
  | 'manager'         // Company management
  | 'dispatcher'      // Trip planning and dispatch
  | 'driver'          // Mobile app access
  | 'operator'        // Basic operations
  | 'viewer'          // Read-only access

export type Permission = 
  | 'users:read' | 'users:write' | 'users:delete'
  | 'vehicles:read' | 'vehicles:write' | 'vehicles:delete'
  | 'trips:read' | 'trips:write' | 'trips:delete'
  | 'loads:read' | 'loads:write' | 'loads:delete'
  | 'reports:read' | 'reports:generate'
  | 'settings:read' | 'settings:write'
  | 'compliance:read' | 'compliance:write'

// ============ VEHICLE MANAGEMENT ============
export interface Vehicle {
  id: string
  registration: string
  type: VehicleType
  make: string
  model: string
  year: number
  vin: string
  status: VehicleStatus
  specifications: VehicleSpecs
  maintenance: MaintenanceRecord[]
  certifications: Certification[]
  assignments: VehicleAssignment[]
  location?: GeoLocation
  createdAt: Date
  updatedAt: Date
}

export type VehicleType = 
  | 'rigid-truck'
  | 'semi-trailer'
  | 'b-double'
  | 'road-train'
  | 'van'
  | 'other'

export type VehicleStatus = 
  | 'available'
  | 'in-transit'
  | 'loading'
  | 'maintenance'
  | 'out-of-service'

export interface VehicleSpecs {
  grossVehicleWeight: number // kg
  tareWeight: number         // kg
  payloadCapacity: number    // kg
  dimensions: {
    length: number           // mm
    width: number           // mm
    height: number          // mm
  }
  fuelType: 'diesel' | 'petrol' | 'electric' | 'hybrid'
  fuelCapacity: number      // litres
  axleConfiguration: string
  isDGCertified: boolean
  palletSpaces: number
  compartments?: Compartment[]
}

export interface Compartment {
  id: string
  name: string
  palletSpaces: number
  maxWeight: number         // kg
  dimensions: {
    length: number          // mm
    width: number          // mm  
    height: number         // mm
  }
  isDGCertified: boolean
  allowedDGClasses: string[]
}

// ============ TRIP & LOAD MANAGEMENT ============
export interface Trip {
  id: string
  tripNumber: string
  status: TripStatus
  vehicle: Vehicle
  driver: User
  client: Client
  route: Route
  loads: Load[]
  startTime?: Date
  endTime?: Date
  distance: number          // km
  createdAt: Date
  updatedAt: Date
}

export type TripStatus = 
  | 'planned'
  | 'in-progress'  
  | 'completed'
  | 'cancelled'
  | 'delayed'

export interface Load {
  id: string
  loadNumber: string
  position: PalletPosition
  cargo: CargoItem
  weight: number            // kg
  status: LoadStatus
  handlingUnit: 'pallet' | 'module' | 'loose'
  isDangerous: boolean
  dgDetails?: DangerousGoodsDetails
}

export interface PalletPosition {
  compartment: string
  level: 'bottom' | 'top' | 'mezzanine'
  row: number
  column: number
}

export type LoadStatus = 
  | 'planned'
  | 'loaded'
  | 'in-transit'
  | 'delivered'

// ============ DANGEROUS GOODS ============
export interface DangerousGoodsDetails {
  unNumber: string
  properShippingName: string
  hazardClass: string
  packingGroup?: 'I' | 'II' | 'III'
  emergencyContact: string
  segregationGroup: string
  specialProvisions: string[]
  quantity: number
  unit: string
}

// ============ CLIENTS & ROUTES ============
export interface Client {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: Address
  billingAddress?: Address
  status: 'active' | 'inactive'
}

export interface Route {
  id: string
  name: string
  origin: Location
  destination: Location
  waypoints: Location[]
  distance: number          // km
  estimatedDuration: number // minutes
  tollCosts?: number        // AUD
}

export interface Location {
  id: string
  name: string
  address: Address
  coordinates: GeoLocation
  contactPerson?: string
  phone?: string
  operatingHours?: OperatingHours
}

export interface GeoLocation {
  latitude: number
  longitude: number
}

export interface OperatingHours {
  monday: TimeSlot[]
  tuesday: TimeSlot[]
  wednesday: TimeSlot[]
  thursday: TimeSlot[]
  friday: TimeSlot[]
  saturday: TimeSlot[]
  sunday: TimeSlot[]
}

export interface TimeSlot {
  open: string    // HH:MM format
  close: string   // HH:MM format
}

// ============ MAINTENANCE & COMPLIANCE ============
export interface MaintenanceRecord {
  id: string
  vehicleId: string
  type: MaintenanceType
  description: string
  cost: number
  datePerformed: Date
  nextDueDate?: Date
  odometer: number
  serviceProvider: string
  invoiceNumber?: string
}

export type MaintenanceType = 
  | 'service'
  | 'repair'
  | 'inspection'
  | 'registration'
  | 'insurance'

export interface Certification {
  id: string
  type: CertificationType
  issuer: string
  issueDate: Date
  expiryDate: Date
  certificateNumber: string
  status: 'valid' | 'expired' | 'suspended'
  documentUrl?: string
}

export type CertificationType = 
  | 'registration'
  | 'roadworthy'
  | 'dangerous-goods'
  | 'insurance'
  | 'weights-inspection'

export interface VehicleAssignment {
  id: string
  driverId: string
  startDate: Date
  endDate?: Date
  status: 'active' | 'inactive'
}

// ============ CARGO & ITEMS ============
export interface CargoItem {
  id: string
  name: string
  description: string
  category: CargoCategory
  weight: number            // kg per unit
  dimensions: {
    length: number          // mm
    width: number          // mm
    height: number         // mm
  }
  isDangerous: boolean
  dgDetails?: DangerousGoodsDetails
  handlingInstructions?: string[]
}

export type CargoCategory = 
  | 'general'
  | 'dangerous-goods'
  | 'fragile'
  | 'perishable'
  | 'oversized'
  | 'valuable'

// ============ SETTINGS ============
export interface CompanySettings {
  timezone: string
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12h' | '24h'
  currency: 'AUD' | 'USD' | 'EUR'
  units: {
    distance: 'km' | 'miles'
    weight: 'kg' | 'lbs'
    volume: 'litres' | 'gallons'
  }
  notifications: NotificationSettings
  compliance: ComplianceSettings
}

export interface NotificationSettings {
  email: boolean
  sms: boolean
  push: boolean
  tripUpdates: boolean
  maintenanceAlerts: boolean
  complianceAlerts: boolean
}

export interface ComplianceSettings {
  requireDGCertification: boolean
  autoSegregationCheck: boolean
  mandatoryInspections: boolean
  weightLimitAlerts: boolean
}

// ============ API RESPONSES ============
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: Date
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
} 