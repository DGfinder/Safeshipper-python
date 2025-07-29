import { useState, useEffect, useCallback } from "react";
import { 
  fleetComplianceService, 
  VehicleSafetyEquipment, 
  FleetComplianceStats,
  ADGFleetReport,
  EquipmentFilter,
  VehicleComplianceStatus
} from "../services/fleetComplianceService";

interface UseFleetComplianceOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialFilters?: EquipmentFilter;
}

interface UseFleetComplianceReturn {
  // Data
  equipment: VehicleSafetyEquipment[];
  complianceStats: FleetComplianceStats | null;
  adgFleetReport: ADGFleetReport | null;
  expiringEquipment: VehicleSafetyEquipment[];
  inspectionDueEquipment: VehicleSafetyEquipment[];
  
  // Loading states
  loading: boolean;
  loadingStats: boolean;
  loadingReport: boolean;
  refreshing: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  updateFilters: (filters: EquipmentFilter) => void;
  scheduleInspection: (equipmentId: string, data: { inspection_date: string; inspection_type?: string }) => Promise<void>;
  updateEquipment: (id: string, data: Partial<VehicleSafetyEquipment>) => Promise<void>;
  checkVehicleCompliance: (vehicleId: string, adrClasses?: string[]) => Promise<VehicleComplianceStatus>;
  exportComplianceReport: (format?: "pdf" | "csv" | "xlsx") => Promise<void>;
  
  // Current filters
  filters: EquipmentFilter;
}

export function useFleetCompliance(options: UseFleetComplianceOptions = {}): UseFleetComplianceReturn {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    initialFilters = {}
  } = options;

  // State
  const [equipment, setEquipment] = useState<VehicleSafetyEquipment[]>([]);
  const [complianceStats, setComplianceStats] = useState<FleetComplianceStats | null>(null);
  const [adgFleetReport, setAdgFleetReport] = useState<ADGFleetReport | null>(null);
  const [expiringEquipment, setExpiringEquipment] = useState<VehicleSafetyEquipment[]>([]);
  const [inspectionDueEquipment, setInspectionDueEquipment] = useState<VehicleSafetyEquipment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<EquipmentFilter>(initialFilters);

  // Fetch safety equipment
  const fetchEquipment = useCallback(async (currentFilters: EquipmentFilter) => {
    try {
      const data = await fleetComplianceService.getVehicleSafetyEquipment(currentFilters);
      setEquipment(data);
    } catch (err) {
      console.error("Failed to fetch safety equipment:", err);
      setError("Failed to load safety equipment");
    }
  }, []);

  // Fetch compliance statistics
  const fetchComplianceStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const stats = await fleetComplianceService.getFleetComplianceStats();
      setComplianceStats(stats);
    } catch (err) {
      console.error("Failed to fetch compliance stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch ADG fleet report
  const fetchADGFleetReport = useCallback(async () => {
    try {
      setLoadingReport(true);
      const report = await fleetComplianceService.generateADGFleetReport();
      setAdgFleetReport(report);
    } catch (err) {
      console.error("Failed to fetch ADG fleet report:", err);
    } finally {
      setLoadingReport(false);
    }
  }, []);

  // Fetch expiring equipment
  const fetchExpiringEquipment = useCallback(async () => {
    try {
      const data = await fleetComplianceService.getExpiringEquipment(30);
      setExpiringEquipment(data);
    } catch (err) {
      console.error("Failed to fetch expiring equipment:", err);
    }
  }, []);

  // Fetch inspection due equipment
  const fetchInspectionDueEquipment = useCallback(async () => {
    try {
      const data = await fleetComplianceService.getInspectionDueEquipment();
      setInspectionDueEquipment(data);
    } catch (err) {
      console.error("Failed to fetch inspection due equipment:", err);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchEquipment(filters),
        fetchComplianceStats(),
        fetchADGFleetReport(),
        fetchExpiringEquipment(),
        fetchInspectionDueEquipment()
      ]);
    } catch (err) {
      console.error("Failed to refresh data:", err);
      setError("Failed to refresh compliance data");
    } finally {
      setRefreshing(false);
    }
  }, [filters, fetchEquipment, fetchComplianceStats, fetchADGFleetReport, fetchExpiringEquipment, fetchInspectionDueEquipment]);

  // Update filters and refetch equipment
  const updateFilters = useCallback(async (newFilters: EquipmentFilter) => {
    setFilters(newFilters);
    setLoading(true);
    try {
      await fetchEquipment(newFilters);
    } finally {
      setLoading(false);
    }
  }, [fetchEquipment]);

  // Schedule inspection for equipment
  const scheduleInspection = useCallback(async (
    equipmentId: string, 
    data: { inspection_date: string; inspection_type?: string }
  ) => {
    try {
      await fleetComplianceService.scheduleInspection(equipmentId, data);
      // Refresh equipment data to show updated inspection schedule
      await fetchEquipment(filters);
    } catch (err) {
      console.error("Failed to schedule inspection:", err);
      throw new Error("Failed to schedule inspection");
    }
  }, [filters, fetchEquipment]);

  // Update equipment
  const updateEquipment = useCallback(async (
    id: string, 
    data: Partial<VehicleSafetyEquipment>
  ) => {
    try {
      const updated = await fleetComplianceService.updateSafetyEquipment(id, data);
      // Update local state
      setEquipment(prev => prev.map(item => item.id === id ? updated : item));
    } catch (err) {
      console.error("Failed to update equipment:", err);
      throw new Error("Failed to update equipment");
    }
  }, []);

  // Check vehicle compliance
  const checkVehicleCompliance = useCallback(async (
    vehicleId: string, 
    adrClasses?: string[]
  ): Promise<VehicleComplianceStatus> => {
    try {
      return await fleetComplianceService.checkVehicleCompliance(vehicleId, adrClasses);
    } catch (err) {
      console.error("Failed to check vehicle compliance:", err);
      throw new Error("Failed to check vehicle compliance");
    }
  }, []);

  // Export compliance report
  const exportComplianceReport = useCallback(async (format: "pdf" | "csv" | "xlsx" = "pdf") => {
    try {
      const blob = await fleetComplianceService.exportComplianceReport(format, filters);
      const filename = `fleet-compliance-report-${new Date().toISOString().split('T')[0]}.${format}`;
      fleetComplianceService.downloadFile(blob, filename);
    } catch (err) {
      console.error("Failed to export compliance report:", err);
      throw new Error("Failed to export compliance report");
    }
  }, [filters]);

  // Initial data fetch
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchEquipment(filters),
          fetchComplianceStats(),
          fetchExpiringEquipment(),
          fetchInspectionDueEquipment()
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []); // Only run on mount

  // Auto refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  return {
    // Data
    equipment,
    complianceStats,
    adgFleetReport,
    expiringEquipment,
    inspectionDueEquipment,
    
    // Loading states
    loading,
    loadingStats,
    loadingReport,
    refreshing,
    
    // Error state
    error,
    
    // Actions
    refreshData,
    updateFilters,
    scheduleInspection,
    updateEquipment,
    checkVehicleCompliance,
    exportComplianceReport,
    
    // Current filters
    filters
  };
}

// Additional hook for individual vehicle compliance
export function useVehicleCompliance(vehicleId: string) {
  const [compliance, setCompliance] = useState<VehicleComplianceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCompliance = useCallback(async (adrClasses?: string[]) => {
    if (!vehicleId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fleetComplianceService.checkVehicleCompliance(vehicleId, adrClasses);
      setCompliance(result);
    } catch (err) {
      console.error("Failed to check vehicle compliance:", err);
      setError("Failed to check vehicle compliance");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleId) {
      checkCompliance();
    }
  }, [vehicleId, checkCompliance]);

  return {
    compliance,
    loading,
    error,
    recheckCompliance: checkCompliance
  };
}

// Hook for equipment due for maintenance/inspection
export function useMaintenanceAlerts() {
  const [alerts, setAlerts] = useState<{
    expiring: VehicleSafetyEquipment[];
    inspectionDue: VehicleSafetyEquipment[];
    overdue: VehicleSafetyEquipment[];
  }>({
    expiring: [],
    inspectionDue: [],
    overdue: []
  });
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [expiring, inspectionDue] = await Promise.all([
        fleetComplianceService.getExpiringEquipment(30),
        fleetComplianceService.getInspectionDueEquipment()
      ]);

      // Filter overdue items from inspection due
      const overdue = inspectionDue.filter(item => {
        if (!item.next_inspection_date) return false;
        const dueDate = new Date(item.next_inspection_date);
        return dueDate < new Date();
      });

      setAlerts({
        expiring,
        inspectionDue: inspectionDue.filter(item => !overdue.some(o => o.id === item.id)),
        overdue
      });
    } catch (err) {
      console.error("Failed to fetch maintenance alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    refresh: fetchAlerts
  };
}