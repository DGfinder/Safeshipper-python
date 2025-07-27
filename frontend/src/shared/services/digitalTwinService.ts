// digitalTwinService.ts
// Digital Twin visualization service for real-time shipment representation
// Supporting operational enhancement tool for situational awareness

export interface DigitalTwinShipment {
  id: string;
  shipmentReference: string;
  status: ShipmentStatus;
  currentLocation: GeoLocation;
  destination: GeoLocation;
  route: RoutePoint[];
  vehicle: VehicleDigitalTwin;
  cargo: CargoDigitalTwin[];
  environmental: EnvironmentalConditions;
  telemetry: TelemetryData;
  alerts: TwinAlert[];
  timeline: TimelineEvent[];
  lastUpdated: string;
}

export type ShipmentStatus = 
  | 'preparing'
  | 'in_transit'
  | 'at_checkpoint'
  | 'delayed'
  | 'delivered'
  | 'exception';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  timestamp: string;
  accuracy: number; // meters
}

export interface RoutePoint {
  id: string;
  location: GeoLocation;
  type: 'pickup' | 'delivery' | 'checkpoint' | 'rest_stop' | 'border_crossing';
  estimatedArrival: string;
  actualArrival?: string;
  status: 'pending' | 'completed' | 'current' | 'delayed';
  duration: number; // minutes
}

export interface VehicleDigitalTwin {
  id: string;
  type: string;
  licensePlate: string;
  driver: {
    name: string;
    id: string;
    hoursWorked: number;
    nextRestRequired: string;
  };
  dimensions: {
    length: number; // meters
    width: number;
    height: number;
    capacity: number; // kg
  };
  performance: {
    speed: number; // km/h
    fuelLevel: number; // percentage
    fuelConsumption: number; // L/100km
    engineTemperature: number; // celsius
    tirePressure: number[]; // PSI for each tire
  };
  safety: {
    abs: boolean;
    ebs: boolean;
    laneAssist: boolean;
    collisionAvoidance: boolean;
    fatigueDetection: boolean;
  };
  maintenance: {
    nextService: string;
    odometer: number; // km
    healthScore: number; // 0-100
    criticalAlerts: string[];
  };
}

export interface CargoDigitalTwin {
  id: string;
  description: string;
  weight: number; // kg
  volume: number; // m³
  position: Position3D;
  dangerousGoods?: {
    unNumber: string;
    hazardClass: string;
    properShippingName: string;
    requiredConditions: string[];
  };
  conditions: {
    temperature: number; // celsius
    humidity: number; // percentage
    vibration: number; // g-force
    orientation: string;
  };
  sensors: {
    temperature?: SensorReading;
    humidity?: SensorReading;
    shock?: SensorReading;
    tilt?: SensorReading;
    gps?: SensorReading;
  };
  compliance: {
    placardingRequired: boolean;
    segregationRules: string[];
    handlingInstructions: string[];
  };
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
  rotation: {
    x: number;
    y: number;
    z: number;
  };
}

export interface SensorReading {
  value: number;
  unit: string;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
  threshold: {
    min: number;
    max: number;
  };
}

export interface EnvironmentalConditions {
  weather: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    visibility: number; // km
    conditions: string;
  };
  traffic: {
    congestionLevel: 'low' | 'medium' | 'high' | 'severe';
    averageSpeed: number; // km/h
    incidents: string[];
  };
  road: {
    surface: 'excellent' | 'good' | 'fair' | 'poor';
    gradient: number; // degrees
    curvature: number; // degrees/km
  };
}

export interface TelemetryData {
  gps: {
    coordinates: GeoLocation;
    speed: number;
    heading: number;
    altitude: number;
  };
  vehicle: {
    engine: {
      rpm: number;
      temperature: number;
      oilPressure: number;
    };
    brakes: {
      pressure: number;
      temperature: number[];
    };
    transmission: {
      gear: number;
      temperature: number;
    };
  };
  cargo: {
    totalWeight: number;
    distribution: WeightDistribution;
    securement: SecurityStatus;
  };
  communication: {
    lastContact: string;
    signalStrength: number;
    dataUsage: number; // MB
  };
}

export interface WeightDistribution {
  front: number; // kg
  rear: number; // kg
  left: number; // kg
  right: number; // kg
  centerOfGravity: Position3D;
}

export interface SecurityStatus {
  containerSealed: boolean;
  sealNumber: string;
  lastSealCheck: string;
  accessEvents: string[];
  integrityStatus: 'secure' | 'compromised' | 'unknown';
}

export interface TwinAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
  actions: AlertAction[];
  affectedSystems: string[];
}

export type AlertType = 
  | 'temperature_excursion'
  | 'route_deviation'
  | 'driver_fatigue'
  | 'vehicle_fault'
  | 'cargo_shift'
  | 'communication_loss'
  | 'security_breach'
  | 'delay_alert'
  | 'compliance_violation'
  | 'emergency_stop';

export interface AlertAction {
  action: string;
  priority: number;
  automated: boolean;
  timeToAct: number; // minutes
  responsible: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'status_change' | 'alert' | 'checkpoint' | 'communication' | 'action_taken';
  title: string;
  description: string;
  location?: GeoLocation;
  actor: string;
  data?: any;
}

export interface TwinVisualizationSettings {
  viewMode: '3d' | 'map' | 'split';
  showRoute: boolean;
  showAlerts: boolean;
  showTelemetry: boolean;
  showCargo: boolean;
  autoFollow: boolean;
  updateInterval: number; // seconds
  alertSeverityFilter: ('info' | 'warning' | 'critical' | 'emergency')[];
}

export interface TwinAnalytics {
  performance: {
    onTimePerformance: number; // percentage
    averageSpeed: number; // km/h
    fuelEfficiency: number; // L/100km
    routeOptimization: number; // percentage vs baseline
  };
  safety: {
    alertsPerTrip: number;
    criticalIncidents: number;
    driverScoreAverage: number;
    complianceRate: number; // percentage
  };
  utilization: {
    capacityUtilization: number; // percentage
    timeUtilization: number; // percentage
    assetUptime: number; // percentage
  };
  predictive: {
    maintenanceAlerts: number;
    delayProbability: number; // percentage
    riskScore: number; // 0-100
  };
}

class DigitalTwinService {
  private seededRandom: any;
  private activeShipments: Map<string, DigitalTwinShipment> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.seededRandom = this.createSeededRandom(67890);
    this.initializeSampleShipments();
  }

  private createSeededRandom(seed: number) {
    let current = seed;
    return () => {
      current = (current * 1103515245 + 12345) & 0x7fffffff;
      return current / 0x7fffffff;
    };
  }

  // Get all active digital twin shipments
  getActiveShipments(): DigitalTwinShipment[] {
    return Array.from(this.activeShipments.values());
  }

  // Get specific shipment digital twin
  getShipmentTwin(shipmentId: string): DigitalTwinShipment | null {
    return this.activeShipments.get(shipmentId) || null;
  }

  // Start real-time simulation updates
  startRealtimeUpdates(callback?: (shipments: DigitalTwinShipment[]) => void): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateAllShipments();
      if (callback) {
        callback(this.getActiveShipments());
      }
    }, 5000); // Update every 5 seconds
  }

  // Stop real-time updates
  stopRealtimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Get twin analytics
  getTwinAnalytics(): TwinAnalytics {
    const shipments = this.getActiveShipments();
    
    return {
      performance: {
        onTimePerformance: 87.5 + this.seededRandom() * 10,
        averageSpeed: 75 + this.seededRandom() * 15,
        fuelEfficiency: 8.2 + this.seededRandom() * 2,
        routeOptimization: 82 + this.seededRandom() * 15,
      },
      safety: {
        alertsPerTrip: 2.3 + this.seededRandom() * 2,
        criticalIncidents: Math.floor(this.seededRandom() * 3),
        driverScoreAverage: 85 + this.seededRandom() * 12,
        complianceRate: 94 + this.seededRandom() * 5,
      },
      utilization: {
        capacityUtilization: 78 + this.seededRandom() * 15,
        timeUtilization: 82 + this.seededRandom() * 12,
        assetUptime: 91 + this.seededRandom() * 8,
      },
      predictive: {
        maintenanceAlerts: Math.floor(this.seededRandom() * 5),
        delayProbability: 15 + this.seededRandom() * 20,
        riskScore: 25 + this.seededRandom() * 30,
      },
    };
  }

  // Get historical data for a shipment
  getShipmentHistory(shipmentId: string, hours: number = 24): TimelineEvent[] {
    const now = Date.now();
    const events: TimelineEvent[] = [];
    
    for (let i = 0; i < hours * 2; i++) { // Every 30 minutes
      const timestamp = new Date(now - (i * 30 * 60 * 1000)).toISOString();
      
      if (this.seededRandom() > 0.7) { // 30% chance of event
        events.push({
          id: `EVT-${timestamp}-${i}`,
          timestamp,
          type: this.getRandomEventType(),
          title: this.generateEventTitle(),
          description: this.generateEventDescription(),
          location: this.generateRandomLocation(),
          actor: 'System',
          data: {},
        });
      }
    }
    
    return events.reverse(); // Chronological order
  }

  private initializeSampleShipments(): void {
    const sampleShipments = [
      {
        id: 'SH-2024-1001',
        origin: 'Perth',
        destination: 'Kalgoorlie',
        cargoType: 'Class 3 Flammable Liquids',
        progress: 0.65,
      },
      {
        id: 'SH-2024-1002',
        origin: 'Fremantle',
        destination: 'Melbourne',
        cargoType: 'General Freight',
        progress: 0.30,
      },
      {
        id: 'SH-2024-1003',
        origin: 'Perth',
        destination: 'Port Hedland',
        cargoType: 'Class 8 Corrosives',
        progress: 0.85,
      },
    ];

    sampleShipments.forEach(sample => {
      const shipment = this.createSampleShipment(sample);
      this.activeShipments.set(shipment.id, shipment);
    });
  }

  private createSampleShipment(sample: any): DigitalTwinShipment {
    const now = new Date();
    
    return {
      id: sample.id,
      shipmentReference: sample.id,
      status: sample.progress >= 1.0 ? 'delivered' : sample.progress >= 0.8 ? 'at_checkpoint' : 'in_transit',
      currentLocation: this.generateLocationAlongRoute(sample.origin, sample.destination, sample.progress),
      destination: this.getLocationCoordinates(sample.destination),
      route: this.generateRoute(sample.origin, sample.destination),
      vehicle: this.generateVehicleTwin(),
      cargo: this.generateCargoTwins(sample.cargoType),
      environmental: this.generateEnvironmentalConditions(),
      telemetry: this.generateTelemetryData(),
      alerts: this.generateAlerts(),
      timeline: this.generateTimeline(),
      lastUpdated: now.toISOString(),
    };
  }

  private generateLocationAlongRoute(origin: string, destination: string, progress: number): GeoLocation {
    const originCoords = this.getLocationCoordinates(origin);
    const destCoords = this.getLocationCoordinates(destination);
    
    const lat = originCoords.latitude + (destCoords.latitude - originCoords.latitude) * progress;
    const lng = originCoords.longitude + (destCoords.longitude - originCoords.longitude) * progress;
    
    return {
      latitude: lat,
      longitude: lng,
      address: `En route from ${origin} to ${destination}`,
      timestamp: new Date().toISOString(),
      accuracy: 5,
    };
  }

  private getLocationCoordinates(location: string): GeoLocation {
    const locations = {
      'Perth': { latitude: -31.9505, longitude: 115.8605 },
      'Kalgoorlie': { latitude: -30.7495, longitude: 121.4683 },
      'Fremantle': { latitude: -32.0569, longitude: 115.7477 },
      'Melbourne': { latitude: -37.8136, longitude: 144.9631 },
      'Port Hedland': { latitude: -20.3192, longitude: 118.5974 },
      'Sydney': { latitude: -33.8688, longitude: 151.2093 },
    };

    const coords = locations[location as keyof typeof locations] || locations['Perth'];
    
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      address: location,
      timestamp: new Date().toISOString(),
      accuracy: 5,
    };
  }

  private generateRoute(origin: string, destination: string): RoutePoint[] {
    const route: RoutePoint[] = [];
    const startCoords = this.getLocationCoordinates(origin);
    const endCoords = this.getLocationCoordinates(destination);
    
    // Add origin
    route.push({
      id: 'START',
      location: startCoords,
      type: 'pickup',
      estimatedArrival: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      actualArrival: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      duration: 30,
    });

    // Add checkpoints
    const checkpointCount = Math.floor(this.seededRandom() * 3) + 1;
    for (let i = 1; i <= checkpointCount; i++) {
      const progress = i / (checkpointCount + 1);
      const lat = startCoords.latitude + (endCoords.latitude - startCoords.latitude) * progress;
      const lng = startCoords.longitude + (endCoords.longitude - startCoords.longitude) * progress;
      
      route.push({
        id: `CHECKPOINT-${i}`,
        location: {
          latitude: lat,
          longitude: lng,
          address: `Checkpoint ${i}`,
          timestamp: new Date().toISOString(),
          accuracy: 5,
        },
        type: 'checkpoint',
        estimatedArrival: new Date(Date.now() + i * 2 * 60 * 60 * 1000).toISOString(),
        status: progress <= 0.65 ? 'completed' : progress <= 0.8 ? 'current' : 'pending',
        duration: 15,
      });
    }

    // Add destination
    route.push({
      id: 'END',
      location: endCoords,
      type: 'delivery',
      estimatedArrival: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      duration: 45,
    });

    return route;
  }

  private generateVehicleTwin(): VehicleDigitalTwin {
    return {
      id: `VEH-${Math.floor(this.seededRandom() * 1000)}`,
      type: 'Dangerous Goods Transport Truck',
      licensePlate: `WA${Math.floor(this.seededRandom() * 1000).toString().padStart(3, '0')}DG`,
      driver: {
        name: ['John Smith', 'Sarah Wilson', 'Mike Johnson', 'Lisa Brown'][Math.floor(this.seededRandom() * 4)],
        id: `DRV-${Math.floor(this.seededRandom() * 1000)}`,
        hoursWorked: 4.5 + this.seededRandom() * 3,
        nextRestRequired: new Date(Date.now() + (8 - 4.5) * 60 * 60 * 1000).toISOString(),
      },
      dimensions: {
        length: 13.6,
        width: 2.5,
        height: 4.0,
        capacity: 40000,
      },
      performance: {
        speed: 85 + this.seededRandom() * 15,
        fuelLevel: 60 + this.seededRandom() * 30,
        fuelConsumption: 25 + this.seededRandom() * 5,
        engineTemperature: 85 + this.seededRandom() * 10,
        tirePressure: Array.from({ length: 6 }, () => 110 + this.seededRandom() * 10),
      },
      safety: {
        abs: true,
        ebs: true,
        laneAssist: true,
        collisionAvoidance: true,
        fatigueDetection: true,
      },
      maintenance: {
        nextService: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        odometer: Math.floor(80000 + this.seededRandom() * 100000),
        healthScore: Math.floor(80 + this.seededRandom() * 18),
        criticalAlerts: this.seededRandom() > 0.8 ? ['Brake pad wear indicator'] : [],
      },
    };
  }

  private generateCargoTwins(cargoType: string): CargoDigitalTwin[] {
    const cargo: CargoDigitalTwin[] = [];
    const itemCount = Math.floor(this.seededRandom() * 3) + 1;
    
    for (let i = 0; i < itemCount; i++) {
      cargo.push({
        id: `CARGO-${i + 1}`,
        description: cargoType,
        weight: 5000 + this.seededRandom() * 10000,
        volume: 8 + this.seededRandom() * 15,
        position: {
          x: this.seededRandom() * 12,
          y: 0.5,
          z: this.seededRandom() * 2,
          rotation: { x: 0, y: 0, z: 0 },
        },
        dangerousGoods: cargoType.includes('Class') ? {
          unNumber: cargoType.includes('3') ? 'UN1203' : 'UN1760',
          hazardClass: cargoType.includes('3') ? '3' : '8',
          properShippingName: cargoType.includes('3') ? 'Gasoline' : 'Corrosive liquid',
          requiredConditions: ['Ventilation', 'Temperature control', 'Segregation'],
        } : undefined,
        conditions: {
          temperature: 18 + this.seededRandom() * 10,
          humidity: 45 + this.seededRandom() * 20,
          vibration: this.seededRandom() * 0.5,
          orientation: 'upright',
        },
        sensors: {
          temperature: {
            value: 22 + this.seededRandom() * 5,
            unit: '°C',
            timestamp: new Date().toISOString(),
            status: 'normal',
            threshold: { min: 15, max: 30 },
          },
          humidity: {
            value: 55 + this.seededRandom() * 15,
            unit: '%',
            timestamp: new Date().toISOString(),
            status: 'normal',
            threshold: { min: 40, max: 80 },
          },
        },
        compliance: {
          placardingRequired: cargoType.includes('Class'),
          segregationRules: ['Keep away from heat sources', 'Segregate from oxidizers'],
          handlingInstructions: ['Use appropriate PPE', 'Follow DG handling procedures'],
        },
      });
    }
    
    return cargo;
  }

  private generateEnvironmentalConditions(): EnvironmentalConditions {
    return {
      weather: {
        temperature: 22 + this.seededRandom() * 15,
        humidity: 45 + this.seededRandom() * 30,
        windSpeed: this.seededRandom() * 25,
        windDirection: this.seededRandom() * 360,
        visibility: 8 + this.seededRandom() * 7,
        conditions: ['Clear', 'Partly Cloudy', 'Overcast', 'Light Rain'][Math.floor(this.seededRandom() * 4)],
      },
      traffic: {
        congestionLevel: ['low', 'medium', 'high'][Math.floor(this.seededRandom() * 3)] as any,
        averageSpeed: 80 + this.seededRandom() * 20,
        incidents: this.seededRandom() > 0.8 ? ['Minor accident ahead', 'Road work zone'] : [],
      },
      road: {
        surface: ['excellent', 'good', 'fair'][Math.floor(this.seededRandom() * 3)] as any,
        gradient: (this.seededRandom() - 0.5) * 10,
        curvature: this.seededRandom() * 15,
      },
    };
  }

  private generateTelemetryData(): TelemetryData {
    return {
      gps: {
        coordinates: this.generateRandomLocation(),
        speed: 85 + this.seededRandom() * 15,
        heading: this.seededRandom() * 360,
        altitude: 200 + this.seededRandom() * 500,
      },
      vehicle: {
        engine: {
          rpm: 1800 + this.seededRandom() * 400,
          temperature: 85 + this.seededRandom() * 10,
          oilPressure: 40 + this.seededRandom() * 20,
        },
        brakes: {
          pressure: 80 + this.seededRandom() * 15,
          temperature: [65, 68, 72, 70].map(t => t + this.seededRandom() * 10),
        },
        transmission: {
          gear: Math.floor(this.seededRandom() * 8) + 1,
          temperature: 75 + this.seededRandom() * 15,
        },
      },
      cargo: {
        totalWeight: 25000 + this.seededRandom() * 15000,
        distribution: {
          front: 12000 + this.seededRandom() * 3000,
          rear: 13000 + this.seededRandom() * 3000,
          left: 12500 + this.seededRandom() * 2000,
          right: 12500 + this.seededRandom() * 2000,
          centerOfGravity: { x: 6.8, y: 1.5, z: 1.25, rotation: { x: 0, y: 0, z: 0 } },
        },
        securement: {
          containerSealed: true,
          sealNumber: `SEAL-${Math.floor(this.seededRandom() * 100000)}`,
          lastSealCheck: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          accessEvents: [],
          integrityStatus: 'secure',
        },
      },
      communication: {
        lastContact: new Date().toISOString(),
        signalStrength: 75 + this.seededRandom() * 20,
        dataUsage: 125 + this.seededRandom() * 50,
      },
    };
  }

  private generateAlerts(): TwinAlert[] {
    const alerts: TwinAlert[] = [];
    
    if (this.seededRandom() > 0.7) {
      alerts.push({
        id: `ALERT-${Date.now()}`,
        type: 'temperature_excursion',
        severity: 'warning',
        title: 'Temperature Monitoring Alert',
        description: 'Cargo temperature approaching upper threshold limit',
        timestamp: new Date().toISOString(),
        acknowledged: false,
        actions: [
          {
            action: 'Check refrigeration unit',
            priority: 1,
            automated: false,
            timeToAct: 30,
            responsible: 'Driver',
          },
        ],
        affectedSystems: ['Cargo sensors', 'Temperature control'],
      });
    }

    if (this.seededRandom() > 0.8) {
      alerts.push({
        id: `ALERT-${Date.now() + 1}`,
        type: 'route_deviation',
        severity: 'info',
        title: 'Route Optimization Suggestion',
        description: 'Alternative route available with 15-minute time saving',
        timestamp: new Date().toISOString(),
        acknowledged: false,
        actions: [
          {
            action: 'Review suggested route',
            priority: 2,
            automated: true,
            timeToAct: 10,
            responsible: 'System',
          },
        ],
        affectedSystems: ['Navigation'],
      });
    }

    return alerts;
  }

  private generateTimeline(): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const now = Date.now();
    
    // Generate events for the last few hours
    for (let i = 0; i < 5; i++) {
      events.push({
        id: `EVT-${now - i}`,
        timestamp: new Date(now - i * 60 * 60 * 1000).toISOString(),
        type: this.getRandomEventType(),
        title: this.generateEventTitle(),
        description: this.generateEventDescription(),
        actor: 'System',
      });
    }
    
    return events.reverse();
  }

  private generateRandomLocation(): GeoLocation {
    return {
      latitude: -31.9505 + (this.seededRandom() - 0.5) * 0.1,
      longitude: 115.8605 + (this.seededRandom() - 0.5) * 0.1,
      address: 'Current Location',
      timestamp: new Date().toISOString(),
      accuracy: 5,
    };
  }

  private getRandomEventType(): TimelineEvent['type'] {
    const types: TimelineEvent['type'][] = ['status_change', 'alert', 'checkpoint', 'communication', 'action_taken'];
    return types[Math.floor(this.seededRandom() * types.length)];
  }

  private generateEventTitle(): string {
    const titles = [
      'Location Update Received',
      'Checkpoint Passed',
      'Temperature Reading Normal',
      'Driver Rest Break',
      'Fuel Level Update',
      'Route Optimization Applied',
    ];
    return titles[Math.floor(this.seededRandom() * titles.length)];
  }

  private generateEventDescription(): string {
    const descriptions = [
      'Automated telemetry update received from vehicle systems',
      'Vehicle passed mandatory checkpoint with all systems normal',
      'Cargo temperature sensors report stable conditions',
      'Driver initiated scheduled rest break as per regulations',
      'Fuel level monitoring indicates normal consumption rates',
      'AI route optimization system applied minor route adjustment',
    ];
    return descriptions[Math.floor(this.seededRandom() * descriptions.length)];
  }

  private updateAllShipments(): void {
    this.activeShipments.forEach(shipment => {
      this.updateShipmentData(shipment);
    });
  }

  private updateShipmentData(shipment: DigitalTwinShipment): void {
    // Update telemetry data
    shipment.telemetry = this.generateTelemetryData();
    
    // Update environmental conditions
    shipment.environmental = this.generateEnvironmentalConditions();
    
    // Update cargo sensor readings
    shipment.cargo.forEach(cargo => {
      if (cargo.sensors.temperature) {
        cargo.sensors.temperature.value = 22 + this.seededRandom() * 5;
        cargo.sensors.temperature.timestamp = new Date().toISOString();
      }
      if (cargo.sensors.humidity) {
        cargo.sensors.humidity.value = 55 + this.seededRandom() * 15;
        cargo.sensors.humidity.timestamp = new Date().toISOString();
      }
    });
    
    // Occasionally add new alerts
    if (this.seededRandom() > 0.95) {
      const newAlert = this.generateAlerts()[0];
      if (newAlert) {
        shipment.alerts.unshift(newAlert);
        shipment.alerts = shipment.alerts.slice(0, 10); // Keep last 10 alerts
      }
    }
    
    shipment.lastUpdated = new Date().toISOString();
  }
}

export const digitalTwinService = new DigitalTwinService();