// hooks/useCustomerProfile.ts
// Shared customer profile management for both internal and customer portal systems

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/stores/auth-store";
import { simulatedDataService } from "@/shared/services/simulatedDataService";
import { customerApiService } from "@/shared/services/customerApiService";
import { getEnvironmentConfig } from "@/shared/config/environment";

// Enhanced customer interface with compliance data
export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  category: "MINING" | "INDUSTRIAL" | "AGRICULTURAL" | "MEDICAL" | "RETAIL";
  joinDate: string;
  totalShipments: number;
  totalValue: number;
  lastShipment: string;
  rating: number;
  dangerousGoods: boolean;
  primaryRoutes: string[];
  locationLat: number;
  locationLng: number;
  complianceProfile?: CustomerComplianceProfile;
}

export interface CustomerComplianceProfile {
  customerId: string;
  complianceRate: number;
  totalShipments: number;
  dgShipments: number;
  authorizedGoods: DangerousGoodsAuthorization[];
  violations: ComplianceViolation[];
  safetyRating: number;
  lastInspection?: string;
  nextCertificationRenewal?: string;
}

export interface DangerousGoodsAuthorization {
  unNumber: string;
  properShippingName: string;
  hazardClass: string;
  packingGroup?: string;
  authorizedUntil: string;
  restrictions?: string[];
}

export interface ComplianceViolation {
  id: string;
  shipmentId: string;
  type: string;
  severity: "Low" | "Medium" | "High";
  date: string;
  status: "Open" | "Resolved";
  description: string;
}

export interface CustomerAccess {
  customerId: string;
  userId?: string;
  accessLevel: "FULL" | "LIMITED" | "VIEW_ONLY";
  features: {
    shipmentTracking: boolean;
    complianceView: boolean;
    documentAccess: boolean;
    supportTickets: boolean;
    notifications: boolean;
  };
}

const API_BASE_URL = "/api/v1";

// API Functions for customer profiles
async function fetchCustomerProfile(customerId: string, token: string): Promise<CustomerProfile> {
  const response = await fetch(`${API_BASE_URL}/customers/${customerId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch customer profile");
  }

  return response.json();
}

async function fetchCustomerByEmail(email: string, token: string): Promise<CustomerProfile> {
  const response = await fetch(`${API_BASE_URL}/customers/by-email/${email}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch customer by email");
  }

  return response.json();
}

async function fetchCustomerCompliance(customerId: string, token: string): Promise<CustomerComplianceProfile> {
  const response = await fetch(`${API_BASE_URL}/customers/${customerId}/compliance/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch customer compliance profile");
  }

  return response.json();
}

// Simulated data functions with environment-aware fallback
function getSimulatedCustomerProfile(customerId: string): CustomerProfile | null {
  const customers = simulatedDataService.getCustomerProfiles();
  const customer = customers.find(c => c.id === customerId);
  
  if (!customer) return null;

  // Add compliance profile
  const complianceProfile = simulatedDataService.getCustomerComplianceProfile(customer.name);
  
  return {
    ...customer,
    complianceProfile: complianceProfile || undefined,
  };
}

function getSimulatedCustomerByEmail(email: string): CustomerProfile | null {
  const customers = simulatedDataService.getCustomerProfiles();
  const customer = customers.find(c => c.email === email);
  
  if (!customer) return null;

  const complianceProfile = simulatedDataService.getCustomerComplianceProfile(customer.name);
  
  return {
    ...customer,
    complianceProfile: complianceProfile || undefined,
  };
}

// Hooks with environment-aware data fetching
export function useCustomerProfile(customerId: string) {
  const { getToken } = useAuthStore();
  const config = getEnvironmentConfig();

  return useQuery({
    queryKey: ["customer-profile", customerId],
    queryFn: async () => {
      if (config.apiMode === "demo") {
        // Pure demo mode - use simulated data only
        const profile = getSimulatedCustomerProfile(customerId);
        if (!profile) throw new Error("Customer not found");
        return { ...profile, _dataSource: 'simulated' };
      }

      // For hybrid and production modes, use the intelligent API service
      const token = getToken();
      if (!token && config.apiMode === "production") {
        throw new Error("No authentication token");
      }

      const response = await customerApiService.getCustomerProfile(customerId, token || '');
      
      if (response.success && response.data) {
        return { ...response.data, _dataSource: response.source, _apiStatus: customerApiService.getApiStatus() };
      }

      // Final fallback to simulated data
      const profile = getSimulatedCustomerProfile(customerId);
      if (!profile) throw new Error("Customer not found");
      return { ...profile, _dataSource: 'simulated_fallback' };
    },
    enabled: !!customerId,
    // Refetch every 5 minutes if using real API
    refetchInterval: config.apiMode === 'production' ? 300000 : undefined,
  });
}

export function useCustomerByEmail(email: string) {
  const { getToken } = useAuthStore();
  const config = getEnvironmentConfig();

  return useQuery({
    queryKey: ["customer-by-email", email],
    queryFn: async () => {
      if (config.apiMode === "demo") {
        const profile = getSimulatedCustomerByEmail(email);
        if (!profile) throw new Error("Customer not found");
        return profile;
      }

      if (config.apiMode === "hybrid") {
        const token = getToken();
        if (token) {
          try {
            return await fetchCustomerByEmail(email, token);
          } catch (error) {
            console.warn("API failed, falling back to simulated data:", error);
            const profile = getSimulatedCustomerByEmail(email);
            if (!profile) throw new Error("Customer not found");
            return profile;
          }
        } else {
          const profile = getSimulatedCustomerByEmail(email);
          if (!profile) throw new Error("Customer not found");
          return profile;
        }
      }

      const token = getToken();
      if (!token) throw new Error("No authentication token");
      return await fetchCustomerByEmail(email, token);
    },
    enabled: !!email,
  });
}

export function useCustomerCompliance(customerId: string) {
  const { getToken } = useAuthStore();
  const config = getEnvironmentConfig();

  return useQuery({
    queryKey: ["customer-compliance", customerId],
    queryFn: async () => {
      if (config.apiMode === "demo") {
        const customer = getSimulatedCustomerProfile(customerId);
        if (!customer?.complianceProfile) throw new Error("Compliance profile not found");
        return { ...customer.complianceProfile, _dataSource: 'simulated' };
      }

      // Use intelligent API service for hybrid and production modes
      const token = getToken();
      if (!token && config.apiMode === "production") {
        throw new Error("No authentication token");
      }

      const response = await customerApiService.getCustomerCompliance(customerId, token || '');
      
      if (response.success && response.data) {
        return { ...response.data, _dataSource: response.source, _apiStatus: customerApiService.getApiStatus() };
      }

      // Final fallback to simulated data
      const customer = getSimulatedCustomerProfile(customerId);
      if (!customer?.complianceProfile) throw new Error("Compliance profile not found");
      return { ...customer.complianceProfile, _dataSource: 'simulated_fallback' };
    },
    enabled: !!customerId,
    // Refetch every 2 minutes for compliance data
    refetchInterval: config.apiMode === 'production' ? 120000 : undefined,
  });
}

// Hook for customer portal authentication
export function useCustomerAccess() {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ["customer-access", user?.email],
    queryFn: async (): Promise<CustomerAccess | null> => {
      if (!user?.email) return null;

      // Check if user has customer access
      const customer = getSimulatedCustomerByEmail(user.email);
      if (!customer) return null;

      return {
        customerId: customer.id,
        userId: user.id,
        accessLevel: "FULL",
        features: {
          shipmentTracking: true,
          complianceView: true,
          documentAccess: true,
          supportTickets: true,
          notifications: true,
        },
      };
    },
    enabled: !!user?.email,
  });
}

// Hook to get all customer profiles (for internal use)
export function useCustomerProfiles() {
  const { getToken } = useAuthStore();
  const config = getEnvironmentConfig();

  return useQuery({
    queryKey: ["customer-profiles"],
    queryFn: async (): Promise<CustomerProfile[]> => {
      if (config.apiMode === "demo") {
        return simulatedDataService.getCustomerProfiles().map(customer => ({
          ...customer,
          complianceProfile: simulatedDataService.getCustomerComplianceProfile(customer.name) || undefined,
        }));
      }

      if (config.apiMode === "hybrid") {
        const token = getToken();
        if (token) {
          try {
            const response = await fetch(`${API_BASE_URL}/customers/`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
            if (response.ok) {
              return await response.json();
            }
          } catch (error) {
            console.warn("API failed, falling back to simulated data:", error);
          }
        }
        
        return simulatedDataService.getCustomerProfiles().map(customer => ({
          ...customer,
          complianceProfile: simulatedDataService.getCustomerComplianceProfile(customer.name) || undefined,
        }));
      }

      const token = getToken();
      if (!token) throw new Error("No authentication token");
      
      const response = await fetch(`${API_BASE_URL}/customers/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch customer profiles");
      }

      return response.json();
    },
  });
}