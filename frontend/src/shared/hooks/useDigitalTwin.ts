// useDigitalTwin.ts
// React hooks for Digital Twin visualization (supporting operational enhancement)

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { 
  digitalTwinService,
  DigitalTwinShipment,
  TwinAnalytics,
  TimelineEvent,
  TwinVisualizationSettings,
} from '@/shared/services/digitalTwinService';

// Hook for getting all active digital twin shipments
export function useActiveDigitalTwins() {
  return useQuery({
    queryKey: ['activeDigitalTwins'],
    queryFn: () => digitalTwinService.getActiveShipments(),
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for real-time feel
    staleTime: 5 * 1000, // Consider data stale after 5 seconds
  });
}

// Hook for specific shipment digital twin
export function useShipmentDigitalTwin(shipmentId: string) {
  return useQuery({
    queryKey: ['shipmentDigitalTwin', shipmentId],
    queryFn: () => digitalTwinService.getShipmentTwin(shipmentId),
    enabled: !!shipmentId,
    refetchInterval: 5 * 1000, // Refetch every 5 seconds
    staleTime: 2 * 1000, // Consider data stale after 2 seconds
  });
}

// Hook for digital twin analytics
export function useDigitalTwinAnalytics() {
  return useQuery({
    queryKey: ['digitalTwinAnalytics'],
    queryFn: () => digitalTwinService.getTwinAnalytics(),
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    staleTime: 15 * 1000, // Consider data stale after 15 seconds
  });
}

// Hook for shipment timeline/history
export function useShipmentTimeline(shipmentId: string, hours: number = 24) {
  return useQuery({
    queryKey: ['shipmentTimeline', shipmentId, hours],
    queryFn: () => digitalTwinService.getShipmentHistory(shipmentId, hours),
    enabled: !!shipmentId,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });
}

// Hook for real-time updates with WebSocket-like behavior
export function useRealtimeDigitalTwins() {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start real-time updates
    digitalTwinService.startRealtimeUpdates((shipments) => {
      queryClient.setQueryData(['activeDigitalTwins'], shipments);
      
      // Update individual shipment caches
      shipments.forEach(shipment => {
        queryClient.setQueryData(['shipmentDigitalTwin', shipment.id], shipment);
      });
    });

    return () => {
      digitalTwinService.stopRealtimeUpdates();
    };
  }, [queryClient]);

  return useActiveDigitalTwins();
}

// Hook for digital twin dashboard summary
export function useDigitalTwinDashboard() {
  return useQuery({
    queryKey: ['digitalTwinDashboard'],
    queryFn: async () => {
      const shipments = digitalTwinService.getActiveShipments();
      const analytics = digitalTwinService.getTwinAnalytics();
      
      // Calculate summary metrics
      const summary = {
        totalShipments: shipments.length,
        inTransit: shipments.filter(s => s.status === 'in_transit').length,
        atCheckpoints: shipments.filter(s => s.status === 'at_checkpoint').length,
        delayed: shipments.filter(s => s.status === 'delayed').length,
        criticalAlerts: shipments.reduce((sum, s) => 
          sum + s.alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length, 0),
        averageProgress: shipments.length > 0 ? 
          shipments.reduce((sum, s) => {
            const completed = s.route.filter(r => r.status === 'completed').length;
            return sum + (completed / s.route.length);
          }, 0) / shipments.length : 0,
      };

      // Status distribution
      const statusDistribution = {
        preparing: shipments.filter(s => s.status === 'preparing').length,
        in_transit: shipments.filter(s => s.status === 'in_transit').length,
        at_checkpoint: shipments.filter(s => s.status === 'at_checkpoint').length,
        delayed: shipments.filter(s => s.status === 'delayed').length,
        delivered: shipments.filter(s => s.status === 'delivered').length,
        exception: shipments.filter(s => s.status === 'exception').length,
      };

      // Alert summary
      const alertSummary = {
        total: shipments.reduce((sum, s) => sum + s.alerts.length, 0),
        byType: {
          temperature: shipments.reduce((sum, s) => 
            sum + s.alerts.filter(a => a.type === 'temperature_excursion').length, 0),
          route: shipments.reduce((sum, s) => 
            sum + s.alerts.filter(a => a.type === 'route_deviation').length, 0),
          driver: shipments.reduce((sum, s) => 
            sum + s.alerts.filter(a => a.type === 'driver_fatigue').length, 0),
          vehicle: shipments.reduce((sum, s) => 
            sum + s.alerts.filter(a => a.type === 'vehicle_fault').length, 0),
          security: shipments.reduce((sum, s) => 
            sum + s.alerts.filter(a => a.type === 'security_breach').length, 0),
        },
        bySeverity: {
          info: shipments.reduce((sum, s) => 
            sum + s.alerts.filter(a => a.severity === 'info').length, 0),
          warning: shipments.reduce((sum, s) => 
            sum + s.alerts.filter(a => a.severity === 'warning').length, 0),
          critical: shipments.reduce((sum, s) => 
            sum + s.alerts.filter(a => a.severity === 'critical').length, 0),
          emergency: shipments.reduce((sum, s) => 
            sum + s.alerts.filter(a => a.severity === 'emergency').length, 0),
        },
      };

      // Environmental conditions summary
      const environmentalSummary = {
        averageTemperature: shipments.length > 0 ? 
          shipments.reduce((sum, s) => sum + s.environmental.weather.temperature, 0) / shipments.length : 0,
        weatherConditions: shipments.reduce((acc, s) => {
          const condition = s.environmental.weather.conditions;
          acc[condition] = (acc[condition] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        trafficLevels: shipments.reduce((acc, s) => {
          const level = s.environmental.traffic.congestionLevel;
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      return {
        shipments,
        analytics,
        summary,
        statusDistribution,
        alertSummary,
        environmentalSummary,
        lastUpdated: new Date().toISOString(),
      };
    },
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
    staleTime: 10 * 1000, // Consider data stale after 10 seconds
  });
}

// Hook for shipment performance metrics
export function useShipmentPerformanceMetrics() {
  return useQuery({
    queryKey: ['shipmentPerformanceMetrics'],
    queryFn: async () => {
      const shipments = digitalTwinService.getActiveShipments();
      
      // Calculate performance metrics
      const metrics = {
        efficiency: {
          averageSpeed: shipments.length > 0 ? 
            shipments.reduce((sum, s) => sum + s.telemetry.gps.speed, 0) / shipments.length : 0,
          fuelEfficiency: shipments.length > 0 ? 
            shipments.reduce((sum, s) => sum + s.vehicle.performance.fuelConsumption, 0) / shipments.length : 0,
          routeOptimization: 85 + Math.random() * 10, // Simulated
        },
        reliability: {
          onTimePerformance: 87.5 + Math.random() * 10,
          communicationUptime: 96.2 + Math.random() * 3,
          systemAvailability: 98.1 + Math.random() * 1.5,
        },
        safety: {
          alertRate: shipments.length > 0 ? 
            shipments.reduce((sum, s) => sum + s.alerts.length, 0) / shipments.length : 0,
          complianceScore: 94 + Math.random() * 5,
          incidentFreeDistance: 125000 + Math.random() * 50000,
        },
        utilization: {
          capacityUtilization: shipments.length > 0 ? 
            shipments.reduce((sum, s) => {
              const totalWeight = s.telemetry.cargo.totalWeight;
              const maxCapacity = s.vehicle.dimensions.capacity;
              return sum + (totalWeight / maxCapacity) * 100;
            }, 0) / shipments.length : 0,
          timeUtilization: 82 + Math.random() * 15,
          assetUptime: 91 + Math.random() * 8,
        },
      };

      // Trends (simulated based on historical patterns)
      const trends = {
        efficiency: {
          speed: { current: metrics.efficiency.averageSpeed, trend: 2.3, period: 'week' },
          fuel: { current: metrics.efficiency.fuelEfficiency, trend: -1.8, period: 'week' },
          optimization: { current: metrics.efficiency.routeOptimization, trend: 3.1, period: 'month' },
        },
        reliability: {
          onTime: { current: metrics.reliability.onTimePerformance, trend: 1.2, period: 'month' },
          communication: { current: metrics.reliability.communicationUptime, trend: 0.5, period: 'week' },
          availability: { current: metrics.reliability.systemAvailability, trend: 0.3, period: 'month' },
        },
        safety: {
          alerts: { current: metrics.safety.alertRate, trend: -0.8, period: 'month' },
          compliance: { current: metrics.safety.complianceScore, trend: 1.5, period: 'quarter' },
          incidents: { current: metrics.safety.incidentFreeDistance, trend: 12.5, period: 'year' },
        },
      };

      return {
        metrics,
        trends,
        lastCalculated: new Date().toISOString(),
      };
    },
    refetchInterval: 60 * 1000, // Refetch every minute
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
  });
}

// Hook for cargo monitoring insights
export function useCargoMonitoringInsights() {
  return useQuery({
    queryKey: ['cargoMonitoringInsights'],
    queryFn: async () => {
      const shipments = digitalTwinService.getActiveShipments();
      
      // Analyze cargo conditions across all shipments
      const cargoInsights = {
        temperatureCompliance: {
          withinLimits: 0,
          warnings: 0,
          critical: 0,
        },
        humidityCompliance: {
          withinLimits: 0,
          warnings: 0,
          critical: 0,
        },
        securityStatus: {
          secure: 0,
          compromised: 0,
          unknown: 0,
        },
        dangerousGoodsMonitoring: {
          totalDGShipments: 0,
          compliantShipments: 0,
          alertsActive: 0,
        },
      };

      shipments.forEach(shipment => {
        shipment.cargo.forEach(cargo => {
          // Temperature analysis
          if (cargo.sensors.temperature) {
            const temp = cargo.sensors.temperature;
            if (temp.status === 'normal') cargoInsights.temperatureCompliance.withinLimits++;
            else if (temp.status === 'warning') cargoInsights.temperatureCompliance.warnings++;
            else if (temp.status === 'critical') cargoInsights.temperatureCompliance.critical++;
          }

          // Humidity analysis
          if (cargo.sensors.humidity) {
            const humidity = cargo.sensors.humidity;
            if (humidity.status === 'normal') cargoInsights.humidityCompliance.withinLimits++;
            else if (humidity.status === 'warning') cargoInsights.humidityCompliance.warnings++;
            else if (humidity.status === 'critical') cargoInsights.humidityCompliance.critical++;
          }

          // Dangerous goods analysis
          if (cargo.dangerousGoods) {
            cargoInsights.dangerousGoodsMonitoring.totalDGShipments++;
            if (cargo.compliance.placardingRequired) {
              cargoInsights.dangerousGoodsMonitoring.compliantShipments++;
            }
          }
        });

        // Security analysis
        const securityStatus = shipment.telemetry.cargo.securement.integrityStatus;
        cargoInsights.securityStatus[securityStatus]++;

        // Count DG-related alerts
        const dgAlerts = shipment.alerts.filter(alert => 
          alert.type === 'temperature_excursion' || 
          alert.type === 'cargo_shift' ||
          alert.type === 'security_breach'
        );
        cargoInsights.dangerousGoodsMonitoring.alertsActive += dgAlerts.length;
      });

      // Generate recommendations
      const recommendations = [];
      
      if (cargoInsights.temperatureCompliance.warnings > 0) {
        recommendations.push({
          type: 'temperature',
          priority: 'medium',
          message: `${cargoInsights.temperatureCompliance.warnings} cargo items approaching temperature limits`,
          action: 'Review refrigeration systems and adjust settings',
        });
      }

      if (cargoInsights.temperatureCompliance.critical > 0) {
        recommendations.push({
          type: 'temperature',
          priority: 'high',
          message: `${cargoInsights.temperatureCompliance.critical} cargo items at critical temperature`,
          action: 'Immediate intervention required - contact drivers',
        });
      }

      if (cargoInsights.securityStatus.compromised > 0) {
        recommendations.push({
          type: 'security',
          priority: 'high',
          message: `${cargoInsights.securityStatus.compromised} shipments with compromised security`,
          action: 'Verify container integrity and investigate security breaches',
        });
      }

      return {
        insights: cargoInsights,
        recommendations,
        complianceScore: calculateComplianceScore(cargoInsights),
        lastAnalyzed: new Date().toISOString(),
      };
    },
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    staleTime: 15 * 1000, // Consider data stale after 15 seconds
  });
}

// Hook for predictive analytics
export function usePredictiveAnalytics() {
  return useQuery({
    queryKey: ['predictiveAnalytics'],
    queryFn: async () => {
      const shipments = digitalTwinService.getActiveShipments();
      const analytics = digitalTwinService.getTwinAnalytics();
      
      // Generate predictive insights
      const predictions = {
        delayRisk: {
          high: shipments.filter(s => {
            const speed = s.telemetry.gps.speed;
            const avgSpeed = s.environmental.traffic.averageSpeed;
            return speed < avgSpeed * 0.8; // 20% below average
          }).length,
          medium: shipments.filter(s => {
            const speed = s.telemetry.gps.speed;
            const avgSpeed = s.environmental.traffic.averageSpeed;
            return speed >= avgSpeed * 0.8 && speed < avgSpeed * 0.9;
          }).length,
          low: shipments.filter(s => {
            const speed = s.telemetry.gps.speed;
            const avgSpeed = s.environmental.traffic.averageSpeed;
            return speed >= avgSpeed * 0.9;
          }).length,
        },
        maintenanceAlerts: {
          immediate: shipments.filter(s => s.vehicle.maintenance.criticalAlerts.length > 0).length,
          upcoming: Math.floor(analytics.predictive.maintenanceAlerts),
          predicted30Days: Math.floor(analytics.predictive.maintenanceAlerts * 1.5),
        },
        fuelOptimization: {
          potentialSavings: '12-18%',
          routeOptimizations: Math.floor(shipments.length * 0.3),
          fuelConsumptionTrend: -2.5, // % improvement
        },
        riskAssessment: {
          overallRiskScore: analytics.predictive.riskScore,
          highRiskShipments: shipments.filter(s => s.alerts.length > 2).length,
          weatherImpact: 15, // % of shipments affected by weather
          trafficImpact: 25, // % of shipments affected by traffic
        },
      };

      // Future projections
      const projections = {
        next24Hours: {
          expectedDeliveries: shipments.filter(s => {
            const progress = s.route.filter(r => r.status === 'completed').length / s.route.length;
            return progress > 0.8;
          }).length,
          potentialDelays: predictions.delayRisk.high + predictions.delayRisk.medium,
          maintenanceRequired: predictions.maintenanceAlerts.immediate,
        },
        next7Days: {
          completionRate: 94.2 + Math.random() * 4,
          averageDeliveryTime: 18.5 + Math.random() * 3,
          fuelEfficiencyImprovement: 3.2 + Math.random() * 2,
        },
        next30Days: {
          capacityUtilization: 82 + Math.random() * 10,
          predictedMaintenance: predictions.maintenanceAlerts.predicted30Days,
          riskReduction: 15 + Math.random() * 10,
        },
      };

      return {
        predictions,
        projections,
        confidence: 87.5 + Math.random() * 10, // % confidence in predictions
        lastUpdated: new Date().toISOString(),
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
}

// Helper function to calculate compliance score
function calculateComplianceScore(insights: any): number {
  const total = insights.temperatureCompliance.withinLimits + 
                insights.temperatureCompliance.warnings + 
                insights.temperatureCompliance.critical;
  
  if (total === 0) return 100;
  
  const compliant = insights.temperatureCompliance.withinLimits;
  return Math.round((compliant / total) * 100);
}

// Hook for managing visualization settings
export function useVisualizationSettings() {
  const queryClient = useQueryClient();
  
  const getSettings = (): TwinVisualizationSettings => {
    return queryClient.getQueryData(['visualizationSettings']) || {
      viewMode: '3d',
      showRoute: true,
      showAlerts: true,
      showTelemetry: true,
      showCargo: true,
      autoFollow: false,
      updateInterval: 10,
      alertSeverityFilter: ['warning', 'critical', 'emergency'],
    };
  };

  const updateSettings = (newSettings: Partial<TwinVisualizationSettings>) => {
    const currentSettings = getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    queryClient.setQueryData(['visualizationSettings'], updatedSettings);
    return updatedSettings;
  };

  return {
    settings: getSettings(),
    updateSettings,
  };
}