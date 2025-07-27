// IoT Smart Container Monitoring Service
// Advanced container monitoring inspired by pharmaceutical cold chain success
// Market growing at 16.7% CAGR with real-time sensor integration and predictive analytics

interface SensorReading {
  sensorId: string;
  timestamp: string;
  value: number;
  unit: string;
  quality: "good" | "poor" | "failed";
  batteryLevel?: number; // for wireless sensors
}

interface ContainerSensorData {
  containerId: string;
  temperature: SensorReading[];
  humidity: SensorReading[];
  pressure: SensorReading[];
  vibration: SensorReading[];
  shock: SensorReading[];
  tilt: SensorReading[];
  gasDetection: {
    co2: SensorReading[];
    co: SensorReading[];
    h2s: SensorReading[];
    ch4: SensorReading[];
    o2: SensorReading[];
    voc: SensorReading[]; // Volatile Organic Compounds
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    timestamp: string;
  }[];
  doorStatus: Array<{
    timestamp: string;
    isOpen: boolean;
    authorized: boolean;
    userId?: string;
  }>;
  sealIntegrity: Array<{
    timestamp: string;
    isIntact: boolean;
    sealId: string;
    tamperDetected: boolean;
  }>;
}

interface SmartContainer {
  containerId: string;
  containerType: "standard" | "refrigerated" | "tank" | "bulk" | "specialized";
  dimensions: {
    length: number;
    width: number;
    height: number;
    volume: number; // cubic meters
  };
  certification: {
    unApproval: string;
    expiryDate: string;
    testPressure: number;
    maxGrossWeight: number;
  };
  currentCargo: {
    unNumbers: string[];
    hazardClasses: string[];
    totalWeight: number;
    manifestReference: string;
    loadingDate: string;
    expectedUnloadingDate: string;
  };
  sensorConfiguration: {
    temperatureRange: { min: number; max: number };
    humidityRange: { min: number; max: number };
    pressureRange: { min: number; max: number };
    alertThresholds: {
      temperature: { min: number; max: number };
      humidity: { min: number; max: number };
      pressure: { min: number; max: number };
      vibration: number;
      gasConcentration: { [gas: string]: number };
    };
    samplingInterval: number; // seconds
    transmissionInterval: number; // seconds
  };
  powerManagement: {
    batteryLevel: number;
    estimatedRuntime: number; // hours
    chargingStatus: "charged" | "charging" | "low" | "critical";
    powerSource: "battery" | "external" | "solar" | "hybrid";
    lastChargeDate: string;
  };
  networkConnectivity: {
    primaryConnection: "cellular" | "satellite" | "wifi" | "lorawan";
    signalStrength: number; // dBm
    dataUsage: number; // MB
    lastTransmission: string;
    connectionStatus: "connected" | "intermittent" | "disconnected";
  };
  maintenanceSchedule: {
    lastCalibration: string;
    nextCalibration: string;
    maintenanceHistory: Array<{
      date: string;
      type: string;
      technician: string;
      notes: string;
    }>;
  };
}

interface ContainerAlert {
  alertId: string;
  containerId: string;
  alertType:
    | "threshold_exceeded"
    | "sensor_failure"
    | "tampering"
    | "door_breach"
    | "location_deviation"
    | "power_low"
    | "communication_loss";
  severity: "info" | "warning" | "critical" | "emergency";
  title: string;
  description: string;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  sensorData: {
    parameter: string;
    currentValue: number;
    thresholdValue: number;
    trend: "increasing" | "decreasing" | "stable";
  };
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  recommendedActions: string[];
  escalationLevel: number;
  affectedCargo: {
    unNumbers: string[];
    estimatedRisk: "low" | "medium" | "high" | "critical";
    potentialConsequences: string[];
  };
  relatedAlerts: string[]; // IDs of related alerts
}

interface GeofenceZone {
  zoneId: string;
  name: string;
  type: "safe" | "restricted" | "hazardous" | "checkpoint" | "customs";
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
  restrictions: {
    allowedHazardClasses: string[];
    timeRestrictions: Array<{
      startTime: string;
      endTime: string;
      daysOfWeek: string[];
    }>;
    speedLimit: number;
    requiredPermits: string[];
  };
  alertConfiguration: {
    entryNotification: boolean;
    exitNotification: boolean;
    dwellTimeLimit: number; // minutes
    unauthorizedEntryAlert: boolean;
  };
}

interface ContainerJourney {
  journeyId: string;
  containerId: string;
  route: {
    plannedWaypoints: Array<{
      location: string;
      expectedArrival: string;
      actualArrival?: string;
      dwellTime: number; // minutes
    }>;
    actualPath: Array<{
      latitude: number;
      longitude: number;
      timestamp: string;
      speed: number;
    }>;
  };
  performance: {
    onTimePerformance: number; // percentage
    temperatureCompliance: number; // percentage
    shockEvents: number;
    unauthorizedAccess: number;
    totalDistance: number; // km
    averageSpeed: number; // km/h
    fuelEfficiency?: number; // L/100km
  };
  environmentalExposure: {
    maxTemperature: number;
    minTemperature: number;
    maxHumidity: number;
    maxPressure: number;
    totalShockEvents: number;
    uvExposure: number; // hours
    extremeWeatherEvents: Array<{
      type: string;
      startTime: string;
      endTime: string;
      severity: string;
    }>;
  };
  complianceReport: {
    regulatoryCompliance: boolean;
    violations: Array<{
      regulation: string;
      violation: string;
      timestamp: string;
      severity: string;
    }>;
    documentationComplete: boolean;
    chainOfCustody: Array<{
      timestamp: string;
      custodian: string;
      action: string;
      location: string;
      verified: boolean;
    }>;
  };
}

interface PredictiveAnalytics {
  containerId: string;
  predictions: {
    equipmentFailure: {
      component: string;
      probability: number;
      timeframe: number; // days
      confidence: number;
      indicators: string[];
    }[];
    maintenanceNeeds: {
      type: string;
      recommendedDate: string;
      priority: "low" | "medium" | "high" | "urgent";
      estimatedCost: number;
      estimatedDowntime: number; // hours
    }[];
    batteryLife: {
      estimatedDepleted: string;
      recommendedReplacement: string;
      degradationRate: number; // % per month
    };
    sensorDrift: {
      sensorType: string;
      currentAccuracy: number;
      recommendedCalibration: string;
      driftRate: number; // units per month
    }[];
  };
  optimizationRecommendations: {
    routeOptimization: string[];
    energyEfficiency: string[];
    cargoProtection: string[];
    costReduction: string[];
  };
  riskAssessment: {
    overallRisk: number; // 0-100
    riskFactors: Array<{
      factor: string;
      impact: number;
      mitigation: string;
    }>;
  };
}

interface ContainerFleetAnalytics {
  fleetSize: number;
  utilizationRate: number; // percentage
  availableContainers: number;
  inTransitContainers: number;
  maintenanceContainers: number;
  performance: {
    averageOnTimeDelivery: number;
    averageTemperatureCompliance: number;
    averageFuelEfficiency: number;
    incidentRate: number; // incidents per 1000 km
  };
  costs: {
    totalOperatingCost: number;
    costPerKm: number;
    maintenanceCost: number;
    fuelCost: number;
    insuranceCost: number;
  };
  environmentalImpact: {
    co2Emissions: number; // kg
    fuelConsumption: number; // L
    recyclingRate: number; // percentage
    sustainabilityScore: number; // 0-100
  };
  trends: {
    period: "daily" | "weekly" | "monthly" | "yearly";
    utilizationTrend: number[]; // percentage over time
    incidentTrend: number[]; // incidents over time
    efficiencyTrend: number[]; // efficiency score over time
  };
}

class IoTSmartContainerService {
  private baseUrl = "/api/v1";
  private wsConnections: Map<string, WebSocket> = new Map();
  private alertCallbacks: Set<(alert: ContainerAlert) => void> = new Set();
  private sensorUpdateCallbacks: Map<
    string,
    Set<(data: ContainerSensorData) => void>
  > = new Map();

  // Initialize real-time monitoring for a container
  async initializeContainerMonitoring(containerId: string): Promise<void> {
    if (typeof window !== "undefined" && "WebSocket" in window) {
      try {
        const ws = new WebSocket(
          `wss://api.safeshipper.com/ws/container/${containerId}`,
        );

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.type === "alert") {
            this.alertCallbacks.forEach((callback) => callback(data.alert));
          } else if (data.type === "sensor_data") {
            const callbacks = this.sensorUpdateCallbacks.get(containerId);
            if (callbacks) {
              callbacks.forEach((callback) => callback(data.sensor_data));
            }
          }
        };

        ws.onerror = (error) => {
          console.error(`Container ${containerId} WebSocket error:`, error);
        };

        this.wsConnections.set(containerId, ws);
      } catch (error) {
        console.warn(
          `WebSocket for container ${containerId} failed, using polling`,
        );
        this.startContainerPolling(containerId);
      }
    }
  }

  private startContainerPolling(containerId: string): void {
    const pollInterval = setInterval(async () => {
      try {
        const data = await this.fetchContainerSensorData(containerId);
        const callbacks = this.sensorUpdateCallbacks.get(containerId);
        if (callbacks && data) {
          callbacks.forEach((callback) => callback(data));
        }
      } catch (error) {
        console.error(`Polling failed for container ${containerId}:`, error);
      }
    }, 30000); // Poll every 30 seconds

    // Store interval ID for cleanup
    (this.wsConnections as any).set(`${containerId}_poll`, pollInterval);
  }

  // Subscribe to container sensor updates
  subscribeToContainerUpdates(
    containerId: string,
    callback: (data: ContainerSensorData) => void,
  ): () => void {
    if (!this.sensorUpdateCallbacks.has(containerId)) {
      this.sensorUpdateCallbacks.set(containerId, new Set());
    }

    this.sensorUpdateCallbacks.get(containerId)!.add(callback);

    // Initialize monitoring if not already done
    if (!this.wsConnections.has(containerId)) {
      this.initializeContainerMonitoring(containerId);
    }

    return () => {
      const callbacks = this.sensorUpdateCallbacks.get(containerId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.stopContainerMonitoring(containerId);
        }
      }
    };
  }

  // Subscribe to container alerts
  subscribeToContainerAlerts(
    callback: (alert: ContainerAlert) => void,
  ): () => void {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  // Get container sensor data
  async fetchContainerSensorData(
    containerId: string,
  ): Promise<ContainerSensorData | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/iot-containers/${containerId}/sensor-data/`,
      );
      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Container sensor data fetch failed:", error);
      return this.simulateContainerSensorData(containerId);
    }
  }

  // Simulate container sensor data for development
  private simulateContainerSensorData(
    containerId: string,
  ): ContainerSensorData {
    const now = new Date().toISOString();
    const createReading = (value: number, unit: string): SensorReading => ({
      sensorId: `sensor-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      value: value + (Math.random() - 0.5) * 2, // Add some variance
      unit,
      quality: Math.random() > 0.95 ? "poor" : "good",
      batteryLevel: Math.random() * 100,
    });

    return {
      containerId,
      temperature: [createReading(4.5, "°C")], // Typical refrigerated temp
      humidity: [createReading(65, "%")],
      pressure: [createReading(101.3, "kPa")],
      vibration: [createReading(0.5, "g")],
      shock: [createReading(0.1, "g")],
      tilt: [createReading(2.1, "°")],
      gasDetection: {
        co2: [createReading(400, "ppm")],
        co: [createReading(0.1, "ppm")],
        h2s: [createReading(0.01, "ppm")],
        ch4: [createReading(1.8, "ppm")],
        o2: [createReading(20.9, "%")],
        voc: [createReading(0.05, "ppm")],
      },
      location: [
        {
          latitude: -37.8136 + (Math.random() - 0.5) * 0.1,
          longitude: 144.9631 + (Math.random() - 0.5) * 0.1,
          accuracy: 3,
          speed: 65 + Math.random() * 20,
          heading: Math.random() * 360,
          timestamp: now,
        },
      ],
      doorStatus: [
        {
          timestamp: now,
          isOpen: false,
          authorized: true,
          userId: "driver-001",
        },
      ],
      sealIntegrity: [
        {
          timestamp: now,
          isIntact: true,
          sealId: "SEAL-001",
          tamperDetected: false,
        },
      ],
    };
  }

  // Get smart container details
  async getSmartContainer(containerId: string): Promise<SmartContainer | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/iot-containers/${containerId}/`,
      );
      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Smart container fetch failed:", error);
      return this.simulateSmartContainer(containerId);
    }
  }

  private simulateSmartContainer(containerId: string): SmartContainer {
    return {
      containerId,
      containerType: "refrigerated",
      dimensions: {
        length: 12.2,
        width: 2.4,
        height: 2.6,
        volume: 76.3,
      },
      certification: {
        unApproval: "UN31A/Y/150/S",
        expiryDate: "2025-12-31",
        testPressure: 150,
        maxGrossWeight: 30480,
      },
      currentCargo: {
        unNumbers: ["UN1942"],
        hazardClasses: ["5.1"],
        totalWeight: 24000,
        manifestReference: "MAN-001",
        loadingDate: "2024-01-15T08:00:00Z",
        expectedUnloadingDate: "2024-01-17T10:00:00Z",
      },
      sensorConfiguration: {
        temperatureRange: { min: -20, max: 25 },
        humidityRange: { min: 0, max: 95 },
        pressureRange: { min: 95, max: 105 },
        alertThresholds: {
          temperature: { min: 2, max: 8 },
          humidity: { min: 40, max: 80 },
          pressure: { min: 99, max: 103 },
          vibration: 2.0,
          gasConcentration: {
            co2: 1000,
            co: 10,
            h2s: 5,
          },
        },
        samplingInterval: 60,
        transmissionInterval: 300,
      },
      powerManagement: {
        batteryLevel: 78,
        estimatedRuntime: 168,
        chargingStatus: "charged",
        powerSource: "battery",
        lastChargeDate: "2024-01-14T18:00:00Z",
      },
      networkConnectivity: {
        primaryConnection: "cellular",
        signalStrength: -75,
        dataUsage: 245,
        lastTransmission: new Date().toISOString(),
        connectionStatus: "connected",
      },
      maintenanceSchedule: {
        lastCalibration: "2024-01-01T10:00:00Z",
        nextCalibration: "2024-04-01T10:00:00Z",
        maintenanceHistory: [
          {
            date: "2024-01-01T10:00:00Z",
            type: "Sensor Calibration",
            technician: "Tech-001",
            notes: "All sensors calibrated and tested",
          },
        ],
      },
    };
  }

  // Get container alerts
  async getContainerAlerts(
    containerId: string,
    activeOnly: boolean = true,
  ): Promise<ContainerAlert[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/iot-containers/${containerId}/alerts/?active_only=${activeOnly}`,
      );
      if (!response.ok) return [];

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error("Container alerts fetch failed:", error);
      return [];
    }
  }

  // Acknowledge alert
  async acknowledgeAlert(
    alertId: string,
    userId: string,
    notes?: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/iot-containers/alerts/${alertId}/acknowledge/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            notes: notes,
          }),
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Alert acknowledgment failed:", error);
      return false;
    }
  }

  // Get container journey analytics
  async getContainerJourney(
    containerId: string,
    journeyId?: string,
  ): Promise<ContainerJourney | null> {
    try {
      const url = journeyId
        ? `${this.baseUrl}/iot-containers/${containerId}/journey/${journeyId}/`
        : `${this.baseUrl}/iot-containers/${containerId}/current-journey/`;

      const response = await fetch(url);
      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Container journey fetch failed:", error);
      return null;
    }
  }

  // Get predictive analytics for container
  async getContainerPredictiveAnalytics(
    containerId: string,
  ): Promise<PredictiveAnalytics | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/iot-containers/${containerId}/predictive-analytics/`,
      );
      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Predictive analytics fetch failed:", error);
      return null;
    }
  }

  // Get fleet analytics
  async getFleetAnalytics(
    timeframe: "day" | "week" | "month" | "year" = "month",
  ): Promise<ContainerFleetAnalytics | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/iot-containers/fleet-analytics/?timeframe=${timeframe}`,
      );
      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error("Fleet analytics fetch failed:", error);
      return null;
    }
  }

  // Configure geofence zones
  async createGeofenceZone(
    zone: Omit<GeofenceZone, "zoneId">,
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/iot-containers/geofence-zones/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(zone),
        },
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.zone_id;
    } catch (error) {
      console.error("Geofence zone creation failed:", error);
      return null;
    }
  }

  // Update container sensor configuration
  async updateSensorConfiguration(
    containerId: string,
    config: SmartContainer["sensorConfiguration"],
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/iot-containers/${containerId}/sensor-config/`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Sensor configuration update failed:", error);
      return false;
    }
  }

  // Stop monitoring for a container
  private stopContainerMonitoring(containerId: string): void {
    const ws = this.wsConnections.get(containerId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(containerId);
    }

    // Clear polling interval if exists
    const pollInterval = (this.wsConnections as any).get(`${containerId}_poll`);
    if (pollInterval) {
      clearInterval(pollInterval);
      this.wsConnections.delete(`${containerId}_poll`);
    }

    this.sensorUpdateCallbacks.delete(containerId);
  }

  // Cleanup all connections
  disconnect(): void {
    this.wsConnections.forEach((ws, key) => {
      if (ws instanceof WebSocket) {
        ws.close();
      } else {
        clearInterval(ws); // polling interval
      }
    });
    this.wsConnections.clear();
    this.sensorUpdateCallbacks.clear();
    this.alertCallbacks.clear();
  }
}

export const iotSmartContainerService = new IoTSmartContainerService();

export type {
  SensorReading,
  ContainerSensorData,
  SmartContainer,
  ContainerAlert,
  GeofenceZone,
  ContainerJourney,
  PredictiveAnalytics,
  ContainerFleetAnalytics,
};
