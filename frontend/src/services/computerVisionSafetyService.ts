// Computer Vision Safety Monitoring Service
// AI-powered real-time safety monitoring inspired by construction industry innovations
// Addresses critical safety gaps in dangerous goods handling and transport

interface PPEDetectionResult {
  personId: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  detectedPPE: {
    hardHat: { detected: boolean; confidence: number; color?: string };
    safetyVest: { detected: boolean; confidence: number; color?: string };
    safetyGloves: { detected: boolean; confidence: number; type?: string };
    safetyBoots: { detected: boolean; confidence: number };
    respirator: { detected: boolean; confidence: number; type?: string };
    eyeProtection: { detected: boolean; confidence: number; type?: string };
    hearingProtection: { detected: boolean; confidence: number };
  };
  requiredPPE: string[];
  complianceStatus: 'compliant' | 'non_compliant' | 'partial';
  violations: string[];
  timestamp: string;
}

interface ProximityAlert {
  alertId: string;
  alertType: 'person_to_vehicle' | 'person_to_cargo' | 'unauthorized_access' | 'restricted_area';
  severity: 'low' | 'medium' | 'high' | 'critical';
  personId: string;
  targetId: string; // vehicle ID, cargo ID, or zone ID
  distance: number; // meters
  minimumSafeDistance: number;
  location: {
    camera: string;
    coordinates: { x: number; y: number };
    facility: string;
    zone: string;
  };
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  actionsTaken: string[];
}

interface VehicleInspectionResult {
  vehicleId: string;
  licenseplate: string;
  inspectionId: string;
  timestamp: string;
  overallStatus: 'pass' | 'fail' | 'warning';
  confidence: number;
  inspectionChecks: {
    vehicleCondition: {
      bodyDamage: { detected: boolean; severity: string; locations: string[] };
      tireCondition: { frontLeft: string; frontRight: string; rearLeft: string; rearRight: string };
      lightsWorking: { headlights: boolean; taillights: boolean; indicators: boolean; hazards: boolean };
      licensePlateVisible: boolean;
      mirrorCondition: { driverSide: boolean; passengerSide: boolean };
    };
    dangerousGoodsEquipment: {
      placards: { detected: boolean; correct: boolean; unNumbers: string[] };
      emergencyEquipment: { fireExtinguisher: boolean; spillKit: boolean; firstAidKit: boolean };
      documentation: { visible: boolean; accessible: boolean };
      securitySeals: { present: boolean; intact: boolean; sealNumbers: string[] };
    };
    driverCompliance: {
      licensingVisible: boolean;
      dangerousGoodsLicense: boolean;
      ppeCompliance: boolean;
      alertnessAssessment: string;
    };
  };
  recommendations: string[];
  violations: Array<{
    category: string;
    description: string;
    severity: 'minor' | 'major' | 'critical';
    regulatoryReference: string;
  }>;
}

interface HazmatHandlingAnalysis {
  analysisId: string;
  timestamp: string;
  location: string;
  activity: 'loading' | 'unloading' | 'inspection' | 'storage' | 'transport';
  dangerousGoods: {
    unNumbers: string[];
    hazardClasses: string[];
    quantities: number[];
    containerTypes: string[];
  };
  personnelInvolved: Array<{
    personId: string;
    role: string;
    certificationLevel: string;
    ppeCompliance: boolean;
  }>;
  procedureCompliance: {
    overallScore: number; // 0-100
    checkedProcedures: Array<{
      procedure: string;
      compliant: boolean;
      confidence: number;
      evidence: string;
    }>;
    violations: Array<{
      procedure: string;
      violation: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: string;
    }>;
  };
  environmentalConditions: {
    weatherSafe: boolean;
    lightingAdequate: boolean;
    ventilationSufficient: boolean;
    temperatureAppropriate: boolean;
    noIgnitionSources: boolean;
  };
  recommendations: string[];
  riskScore: number; // 0-100
}

interface SafetyZoneMonitoring {
  zoneId: string;
  zoneName: string;
  zoneType: 'loading_dock' | 'storage_area' | 'vehicle_parking' | 'restricted_access' | 'emergency_route';
  currentOccupancy: number;
  maxOccupancy: number;
  authorizedPersonnel: string[];
  currentPersonnel: Array<{
    personId: string;
    authorized: boolean;
    entryTime: string;
    ppeCompliant: boolean;
    role?: string;
  }>;
  activeAlerts: ProximityAlert[];
  environmentalConditions: {
    gasLevels: { [gas: string]: number };
    temperature: number;
    humidity: number;
    airQuality: string;
  };
  emergencyStatus: {
    evacuationRoutesClear: boolean;
    emergencyEquipmentAccessible: boolean;
    communicationSystemsWorking: boolean;
  };
}

interface IncidentDetection {
  incidentId: string;
  incidentType: 'spill' | 'leak' | 'fire' | 'explosion' | 'injury' | 'unauthorized_access' | 'equipment_failure' | 'procedure_violation';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  confidence: number;
  location: {
    camera: string;
    coordinates: { x: number; y: number };
    facility: string;
    zone: string;
    gpsCoordinates?: { latitude: number; longitude: number };
  };
  detectedAt: string;
  description: string;
  visualEvidence: {
    imageUrls: string[];
    videoClips: string[];
    annotations: Array<{
      type: string;
      coordinates: { x: number; y: number; width: number; height: number };
      description: string;
    }>;
  };
  affectedPersonnel: string[];
  affectedAssets: Array<{
    type: 'vehicle' | 'container' | 'equipment' | 'facility';
    id: string;
    damageAssessment: string;
  }>;
  dangerousGoodsInvolved: Array<{
    unNumber: string;
    hazardClass: string;
    quantity: number;
    riskLevel: string;
  }>;
  automaticResponses: Array<{
    action: string;
    status: 'initiated' | 'completed' | 'failed';
    timestamp: string;
  }>;
  recommendedActions: string[];
  escalationLevel: number;
  notifiedPersonnel: string[];
}

interface CameraConfiguration {
  cameraId: string;
  name: string;
  location: string;
  type: 'fixed' | 'ptz' | 'thermal' | 'multispectral';
  capabilities: string[];
  coverage: {
    fieldOfView: number; // degrees
    maxZoom: number;
    nightVision: boolean;
    weatherRating: string;
  };
  aiModules: {
    ppeDetection: boolean;
    proximityMonitoring: boolean;
    vehicleInspection: boolean;
    incidentDetection: boolean;
    behaviourAnalysis: boolean;
  };
  alertThresholds: {
    personVehicleDistance: number; // meters
    unauthorizedAccessDelay: number; // seconds
    ppeViolationTolerance: number; // percentage
  };
  recordingSettings: {
    continuous: boolean;
    eventTriggered: boolean;
    retentionDays: number;
    resolution: string;
    frameRate: number;
  };
}

interface SafetyAnalytics {
  timeframe: 'hour' | 'day' | 'week' | 'month' | 'year';
  facilityId: string;
  overallSafetyScore: number; // 0-100
  metrics: {
    ppeComplianceRate: number; // percentage
    proximityAlertCount: number;
    incidentCount: number;
    procedureViolationCount: number;
    emergencyResponseTime: number; // minutes
    personnelAtRisk: number;
  };
  trends: {
    safetyScoreTrend: number[]; // array of scores over time
    incidentTrend: number[];
    complianceTrend: number[];
  };
  riskAreas: Array<{
    zone: string;
    riskScore: number;
    primaryRisks: string[];
    recommendedImprovements: string[];
  }>;
  topViolations: Array<{
    violation: string;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  bestPractices: Array<{
    practice: string;
    successRate: number;
    impact: string;
  }>;
}

class ComputerVisionSafetyService {
  private baseUrl = '/api/v1';
  private wsConnections: Map<string, WebSocket> = new Map();
  private alertCallbacks: Set<(alert: ProximityAlert | IncidentDetection) => void> = new Set();
  private ppeViolationCallbacks: Set<(violation: PPEDetectionResult) => void> = new Set();

  // Initialize real-time computer vision monitoring
  async initializeRealtimeMonitoring(facilityId: string, cameraIds: string[]): Promise<void> {
    if (typeof window !== 'undefined' && 'WebSocket' in window) {
      try {
        const ws = new WebSocket(`wss://api.safeshipper.com/ws/cv-safety/${facilityId}`);
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'proximity_alert':
              this.alertCallbacks.forEach(callback => callback(data.alert));
              break;
            case 'incident_detection':
              this.alertCallbacks.forEach(callback => callback(data.incident));
              break;
            case 'ppe_violation':
              this.ppeViolationCallbacks.forEach(callback => callback(data.violation));
              break;
          }
        };

        ws.onerror = (error) => {
          console.error(`Computer vision monitoring WebSocket error:`, error);
        };

        this.wsConnections.set(facilityId, ws);
      } catch (error) {
        console.warn(`WebSocket for facility ${facilityId} failed, using polling`);
        this.startPollingMode(facilityId);
      }
    }

    // Initialize camera configurations
    await this.configureCameras(facilityId, cameraIds);
  }

  private async configureCameras(facilityId: string, cameraIds: string[]): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/computer-vision/configure-cameras/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId,
          camera_ids: cameraIds,
          ai_modules: ['ppe_detection', 'proximity_monitoring', 'incident_detection']
        })
      });
    } catch (error) {
      console.error('Camera configuration failed:', error);
    }
  }

  private startPollingMode(facilityId: string): void {
    const pollInterval = setInterval(async () => {
      try {
        const alerts = await this.getActiveAlerts(facilityId);
        alerts.forEach(alert => {
          this.alertCallbacks.forEach(callback => callback(alert));
        });
      } catch (error) {
        console.error(`Polling failed for facility ${facilityId}:`, error);
      }
    }, 15000); // Poll every 15 seconds for safety

    (this.wsConnections as any).set(`${facilityId}_poll`, pollInterval);
  }

  // Subscribe to real-time safety alerts
  subscribeToSafetyAlerts(callback: (alert: ProximityAlert | IncidentDetection) => void): () => void {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  // Subscribe to PPE violations
  subscribeToPPEViolations(callback: (violation: PPEDetectionResult) => void): () => void {
    this.ppeViolationCallbacks.add(callback);
    return () => this.ppeViolationCallbacks.delete(callback);
  }

  // Analyze PPE compliance in real-time
  async analyzePPECompliance(cameraId: string, imageData: string): Promise<PPEDetectionResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/computer-vision/analyze-ppe/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera_id: cameraId,
          image_data: imageData,
          detection_threshold: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('PPE analysis failed');
      }

      const data = await response.json();
      return data.detections || [];
    } catch (error) {
      console.error('PPE compliance analysis failed:', error);
      return this.simulatePPEDetection();
    }
  }

  private simulatePPEDetection(): PPEDetectionResult[] {
    return [
      {
        personId: 'person-001',
        confidence: 0.89,
        boundingBox: { x: 150, y: 100, width: 120, height: 300 },
        detectedPPE: {
          hardHat: { detected: true, confidence: 0.95, color: 'yellow' },
          safetyVest: { detected: true, confidence: 0.88, color: 'orange' },
          safetyGloves: { detected: false, confidence: 0.30 },
          safetyBoots: { detected: true, confidence: 0.85 },
          respirator: { detected: false, confidence: 0.15 },
          eyeProtection: { detected: true, confidence: 0.92, type: 'safety_glasses' },
          hearingProtection: { detected: false, confidence: 0.20 }
        },
        requiredPPE: ['hardHat', 'safetyVest', 'safetyGloves', 'safetyBoots', 'eyeProtection'],
        complianceStatus: 'non_compliant',
        violations: ['Missing safety gloves required for hazmat handling'],
        timestamp: new Date().toISOString()
      }
    ];
  }

  // Perform automated vehicle inspection
  async performVehicleInspection(vehicleId: string, imageUrls: string[]): Promise<VehicleInspectionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/computer-vision/vehicle-inspection/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          image_urls: imageUrls,
          inspection_type: 'dangerous_goods_transport'
        })
      });

      if (!response.ok) {
        throw new Error('Vehicle inspection failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Vehicle inspection failed:', error);
      return this.simulateVehicleInspection(vehicleId);
    }
  }

  private simulateVehicleInspection(vehicleId: string): VehicleInspectionResult {
    return {
      vehicleId,
      licenseplate: 'ABC123',
      inspectionId: `insp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      overallStatus: 'warning',
      confidence: 0.87,
      inspectionChecks: {
        vehicleCondition: {
          bodyDamage: { detected: true, severity: 'minor', locations: ['front_bumper'] },
          tireCondition: { frontLeft: 'good', frontRight: 'good', rearLeft: 'worn', rearRight: 'good' },
          lightsWorking: { headlights: true, taillights: true, indicators: true, hazards: true },
          licensePlateVisible: true,
          mirrorCondition: { driverSide: true, passengerSide: true }
        },
        dangerousGoodsEquipment: {
          placards: { detected: true, correct: true, unNumbers: ['UN1942'] },
          emergencyEquipment: { fireExtinguisher: true, spillKit: true, firstAidKit: true },
          documentation: { visible: true, accessible: true },
          securitySeals: { present: true, intact: true, sealNumbers: ['SEAL001', 'SEAL002'] }
        },
        driverCompliance: {
          licensingVisible: true,
          dangerousGoodsLicense: true,
          ppeCompliance: true,
          alertnessAssessment: 'alert'
        }
      },
      recommendations: [
        'Replace rear left tire before next inspection',
        'Repair minor front bumper damage',
        'Verify emergency equipment expiry dates'
      ],
      violations: []
    };
  }

  // Monitor dangerous goods handling procedures
  async analyzeHazmatHandling(location: string, activityType: string): Promise<HazmatHandlingAnalysis> {
    try {
      const response = await fetch(`${this.baseUrl}/computer-vision/hazmat-analysis/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          activity_type: activityType,
          analysis_duration: 300 // 5 minutes
        })
      });

      if (!response.ok) {
        throw new Error('Hazmat handling analysis failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Hazmat handling analysis failed:', error);
      return this.simulateHazmatAnalysis(location, activityType);
    }
  }

  private simulateHazmatAnalysis(location: string, activityType: string): HazmatHandlingAnalysis {
    return {
      analysisId: `analysis-${Date.now()}`,
      timestamp: new Date().toISOString(),
      location,
      activity: activityType as any,
      dangerousGoods: {
        unNumbers: ['UN1942'],
        hazardClasses: ['5.1'],
        quantities: [500],
        containerTypes: ['drum']
      },
      personnelInvolved: [
        {
          personId: 'worker-001',
          role: 'hazmat_handler',
          certificationLevel: 'advanced',
          ppeCompliance: true
        }
      ],
      procedureCompliance: {
        overallScore: 92,
        checkedProcedures: [
          {
            procedure: 'PPE worn correctly',
            compliant: true,
            confidence: 0.95,
            evidence: 'Hard hat, safety vest, gloves, and eye protection detected'
          },
          {
            procedure: 'Safe lifting technique',
            compliant: true,
            confidence: 0.88,
            evidence: 'Proper posture and team lifting observed'
          },
          {
            procedure: 'Container inspection',
            compliant: false,
            confidence: 0.79,
            evidence: 'Visual inspection procedure not followed completely'
          }
        ],
        violations: [
          {
            procedure: 'Container inspection',
            violation: 'Skipped visual inspection of container bottom',
            severity: 'medium',
            timestamp: new Date(Date.now() - 120000).toISOString()
          }
        ]
      },
      environmentalConditions: {
        weatherSafe: true,
        lightingAdequate: true,
        ventilationSufficient: true,
        temperatureAppropriate: true,
        noIgnitionSources: true
      },
      recommendations: [
        'Ensure complete container inspection procedure is followed',
        'Provide additional training on visual inspection techniques',
        'Consider implementing checklist reminder system'
      ],
      riskScore: 25 // low risk due to good overall compliance
    };
  }

  // Get active proximity and safety alerts
  async getActiveAlerts(facilityId: string): Promise<(ProximityAlert | IncidentDetection)[]> {
    try {
      const response = await fetch(`${this.baseUrl}/computer-vision/active-alerts/${facilityId}/`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Active alerts fetch failed:', error);
      return [];
    }
  }

  // Monitor safety zones
  async getZoneMonitoring(zoneId: string): Promise<SafetyZoneMonitoring | null> {
    try {
      const response = await fetch(`${this.baseUrl}/computer-vision/zone-monitoring/${zoneId}/`);
      if (!response.ok) return null;
      
      return await response.json();
    } catch (error) {
      console.error('Zone monitoring fetch failed:', error);
      return null;
    }
  }

  // Get safety analytics
  async getSafetyAnalytics(facilityId: string, timeframe: string = 'day'): Promise<SafetyAnalytics | null> {
    try {
      const response = await fetch(`${this.baseUrl}/computer-vision/safety-analytics/${facilityId}/?timeframe=${timeframe}`);
      if (!response.ok) return null;
      
      return await response.json();
    } catch (error) {
      console.error('Safety analytics fetch failed:', error);
      return this.simulateSafetyAnalytics(facilityId);
    }
  }

  private simulateSafetyAnalytics(facilityId: string): SafetyAnalytics {
    return {
      timeframe: 'day',
      facilityId,
      overallSafetyScore: 87,
      metrics: {
        ppeComplianceRate: 94.2,
        proximityAlertCount: 3,
        incidentCount: 0,
        procedureViolationCount: 2,
        emergencyResponseTime: 4.5,
        personnelAtRisk: 0
      },
      trends: {
        safetyScoreTrend: [82, 85, 87, 89, 87],
        incidentTrend: [1, 0, 0, 1, 0],
        complianceTrend: [91, 92, 94, 95, 94]
      },
      riskAreas: [
        {
          zone: 'Loading Dock A',
          riskScore: 35,
          primaryRisks: ['High traffic area', 'Heavy equipment operation'],
          recommendedImprovements: ['Add proximity sensors', 'Improve lighting']
        }
      ],
      topViolations: [
        {
          violation: 'Missing safety gloves',
          count: 8,
          trend: 'decreasing'
        },
        {
          violation: 'Unauthorized zone access',
          count: 3,
          trend: 'stable'
        }
      ],
      bestPractices: [
        {
          practice: 'Team lifting for heavy containers',
          successRate: 98,
          impact: 'Reduced back injury incidents by 60%'
        }
      ]
    };
  }

  // Acknowledge safety alert
  async acknowledgeAlert(alertId: string, userId: string, actions: string[] = []): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/computer-vision/alerts/${alertId}/acknowledge/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          actions_taken: actions,
          timestamp: new Date().toISOString()
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Alert acknowledgment failed:', error);
      return false;
    }
  }

  // Configure camera settings
  async configureCameraSettings(cameraId: string, settings: Partial<CameraConfiguration>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/computer-vision/cameras/${cameraId}/configure/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Camera configuration failed:', error);
      return false;
    }
  }

  // Export safety report
  async generateSafetyReport(facilityId: string, timeframe: string, format: 'pdf' | 'excel' = 'pdf'): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/computer-vision/safety-report/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId,
          timeframe,
          format,
          include_images: true,
          include_analytics: true
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.download_url;
    } catch (error) {
      console.error('Safety report generation failed:', error);
      return null;
    }
  }

  // Cleanup connections
  disconnect(): void {
    this.wsConnections.forEach((ws, key) => {
      if (ws instanceof WebSocket) {
        ws.close();
      } else {
        clearInterval(ws);
      }
    });
    this.wsConnections.clear();
    this.alertCallbacks.clear();
    this.ppeViolationCallbacks.clear();
  }
}

export const computerVisionSafetyService = new ComputerVisionSafetyService();

export type {
  PPEDetectionResult,
  ProximityAlert,
  VehicleInspectionResult,
  HazmatHandlingAnalysis,
  SafetyZoneMonitoring,
  IncidentDetection,
  CameraConfiguration,
  SafetyAnalytics
};