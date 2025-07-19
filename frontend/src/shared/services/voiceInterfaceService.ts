// voiceInterfaceService.ts
// Voice-activated logistics interface with natural language processing
// Enables voice commands and queries for transport operations

export interface VoiceCommand {
  id: string;
  timestamp: string;
  originalText: string;
  processedText: string;
  intent: VoiceIntent;
  entities: VoiceEntity[];
  confidence: number;
  response: VoiceResponse;
  executionTime: number; // milliseconds
  status: 'processing' | 'completed' | 'failed' | 'requires_clarification';
  userId: string;
}

export type VoiceIntent = 
  | 'shipment_status'
  | 'create_shipment'
  | 'update_shipment'
  | 'find_vehicle'
  | 'driver_status'
  | 'route_optimization'
  | 'customer_inquiry'
  | 'generate_report'
  | 'system_status'
  | 'emergency_alert'
  | 'cost_analysis'
  | 'schedule_pickup'
  | 'track_delivery'
  | 'compliance_check'
  | 'maintenance_alert'
  | 'weather_check'
  | 'capacity_check'
  | 'documentation_status'
  | 'financial_summary';

export interface VoiceEntity {
  type: EntityType;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export type EntityType = 
  | 'shipment_id'
  | 'customer_name'
  | 'vehicle_id'
  | 'driver_name'
  | 'location'
  | 'date'
  | 'time'
  | 'cargo_type'
  | 'route'
  | 'priority'
  | 'status'
  | 'amount'
  | 'duration'
  | 'distance';

export interface VoiceResponse {
  type: 'text' | 'data' | 'action' | 'clarification';
  content: string;
  data?: any;
  actions?: VoiceAction[];
  clarificationQuestions?: string[];
  audioResponse?: string; // Text-to-speech content
  visualComponents?: VoiceVisualComponent[];
}

export interface VoiceAction {
  actionType: 'navigate' | 'execute' | 'update' | 'create' | 'alert';
  target: string;
  parameters: Record<string, any>;
  confirmation: boolean;
  description: string;
}

export interface VoiceVisualComponent {
  type: 'chart' | 'table' | 'map' | 'status' | 'form';
  data: any;
  title: string;
  description?: string;
}

export interface VoiceCapability {
  intent: VoiceIntent;
  description: string;
  examples: string[];
  requiredEntities: EntityType[];
  optionalEntities: EntityType[];
  permissions: string[];
}

export interface VoiceSession {
  sessionId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  commands: VoiceCommand[];
  context: Record<string, any>;
  language: string;
  isActive: boolean;
}

class VoiceInterfaceService {
  private seededRandom: any;
  private currentSession: VoiceSession | null = null;

  constructor() {
    this.seededRandom = this.createSeededRandom(45678);
  }

  private createSeededRandom(seed: number) {
    let current = seed;
    return () => {
      current = (current * 1103515245 + 12345) & 0x7fffffff;
      return current / 0x7fffffff;
    };
  }

  // Start a new voice session
  startVoiceSession(userId: string): VoiceSession {
    this.currentSession = {
      sessionId: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      startTime: new Date().toISOString(),
      commands: [],
      context: {},
      language: 'en-AU',
      isActive: true,
    };
    return this.currentSession;
  }

  // End the current voice session
  endVoiceSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date().toISOString();
      this.currentSession.isActive = false;
    }
  }

  // Process a voice command
  async processVoiceCommand(audioText: string, userId: string): Promise<VoiceCommand> {
    const startTime = Date.now();
    
    // Simulate voice processing delay
    await new Promise(resolve => setTimeout(resolve, 800 + this.seededRandom() * 1200));

    const processedText = this.preprocessText(audioText);
    const intent = this.extractIntent(processedText);
    const entities = this.extractEntities(processedText, intent);
    const confidence = this.calculateConfidence(intent, entities);
    
    const response = await this.generateResponse(intent, entities, processedText);
    const executionTime = Date.now() - startTime;

    const command: VoiceCommand = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      originalText: audioText,
      processedText,
      intent,
      entities,
      confidence,
      response,
      executionTime,
      status: confidence > 0.7 ? 'completed' : 'requires_clarification',
      userId,
    };

    if (this.currentSession) {
      this.currentSession.commands.push(command);
    }

    return command;
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractIntent(text: string): VoiceIntent {
    const intentPatterns: Record<VoiceIntent, string[]> = {
      shipment_status: ['status of', 'where is', 'shipment', 'delivery status', 'track'],
      create_shipment: ['create', 'new shipment', 'book shipment', 'schedule pickup'],
      update_shipment: ['update', 'change', 'modify shipment', 'reschedule'],
      find_vehicle: ['find vehicle', 'available truck', 'nearest vehicle', 'vehicle location'],
      driver_status: ['driver', 'where is driver', 'driver location', 'driver hours'],
      route_optimization: ['optimize route', 'best route', 'shortest path', 'fastest route'],
      customer_inquiry: ['customer', 'client details', 'customer status', 'contact'],
      generate_report: ['report', 'generate report', 'create report', 'analytics'],
      system_status: ['system status', 'health check', 'system health', 'operations status'],
      emergency_alert: ['emergency', 'urgent', 'breakdown', 'accident', 'help'],
      cost_analysis: ['cost', 'expense', 'financial', 'profit', 'revenue'],
      schedule_pickup: ['pickup', 'collection', 'schedule pickup', 'arrange collection'],
      track_delivery: ['delivery', 'arrival', 'eta', 'when will arrive'],
      compliance_check: ['compliance', 'regulations', 'legal', 'audit', 'certification'],
      maintenance_alert: ['maintenance', 'service', 'repair', 'vehicle check'],
      weather_check: ['weather', 'conditions', 'forecast', 'rain', 'storm'],
      capacity_check: ['capacity', 'available space', 'load', 'utilization'],
      documentation_status: ['documents', 'paperwork', 'certification', 'permits'],
      financial_summary: ['financial summary', 'money', 'cash flow', 'payments'],
    };

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          return intent as VoiceIntent;
        }
      }
    }

    return 'shipment_status'; // Default intent
  }

  private extractEntities(text: string, intent: VoiceIntent): VoiceEntity[] {
    const entities: VoiceEntity[] = [];

    // Extract shipment IDs
    const shipmentMatch = text.match(/sh[-\s]?(\d{4}[-\s]?\d{4})/i);
    if (shipmentMatch) {
      entities.push({
        type: 'shipment_id',
        value: `SH-${shipmentMatch[1].replace(/[-\s]/g, '')}`,
        confidence: 0.95,
        startIndex: shipmentMatch.index!,
        endIndex: shipmentMatch.index! + shipmentMatch[0].length,
      });
    }

    // Extract vehicle IDs
    const vehicleMatch = text.match(/(?:truck|vehicle|trk)[-\s]?(\d{3}|\d{2,4})/i);
    if (vehicleMatch) {
      entities.push({
        type: 'vehicle_id',
        value: `TRK-${vehicleMatch[1].padStart(3, '0')}`,
        confidence: 0.9,
        startIndex: vehicleMatch.index!,
        endIndex: vehicleMatch.index! + vehicleMatch[0].length,
      });
    }

    // Extract customer names
    const customerPatterns = ['outback haul', 'mining corp', 'coastal freight', 'desert logistics'];
    for (const customer of customerPatterns) {
      if (text.includes(customer)) {
        const index = text.indexOf(customer);
        entities.push({
          type: 'customer_name',
          value: customer.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          confidence: 0.85,
          startIndex: index,
          endIndex: index + customer.length,
        });
      }
    }

    // Extract locations
    const locations = ['perth', 'kalgoorlie', 'port hedland', 'fremantle', 'geraldton', 'broome', 'karratha'];
    for (const location of locations) {
      if (text.includes(location)) {
        const index = text.indexOf(location);
        entities.push({
          type: 'location',
          value: location.charAt(0).toUpperCase() + location.slice(1),
          confidence: 0.8,
          startIndex: index,
          endIndex: index + location.length,
        });
      }
    }

    // Extract dates and times
    const datePattern = /(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2})/i;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
      entities.push({
        type: 'date',
        value: dateMatch[0],
        confidence: 0.75,
        startIndex: dateMatch.index!,
        endIndex: dateMatch.index! + dateMatch[0].length,
      });
    }

    return entities;
  }

  private calculateConfidence(intent: VoiceIntent, entities: VoiceEntity[]): number {
    let confidence = 0.6; // Base confidence

    // Increase confidence based on entities found
    confidence += entities.length * 0.1;

    // Increase confidence for specific entities relevant to intent
    if (intent === 'shipment_status' && entities.some(e => e.type === 'shipment_id')) {
      confidence += 0.2;
    }
    if (intent === 'find_vehicle' && entities.some(e => e.type === 'vehicle_id')) {
      confidence += 0.2;
    }
    if (intent === 'customer_inquiry' && entities.some(e => e.type === 'customer_name')) {
      confidence += 0.2;
    }

    return Math.min(0.98, confidence);
  }

  private async generateResponse(intent: VoiceIntent, entities: VoiceEntity[], text: string): Promise<VoiceResponse> {
    const responses: Record<VoiceIntent, () => VoiceResponse> = {
      shipment_status: () => this.handleShipmentStatusQuery(entities),
      create_shipment: () => this.handleCreateShipmentCommand(entities),
      update_shipment: () => this.handleUpdateShipmentCommand(entities),
      find_vehicle: () => this.handleFindVehicleQuery(entities),
      driver_status: () => this.handleDriverStatusQuery(entities),
      route_optimization: () => this.handleRouteOptimizationQuery(entities),
      customer_inquiry: () => this.handleCustomerInquiry(entities),
      generate_report: () => this.handleGenerateReportCommand(entities),
      system_status: () => this.handleSystemStatusQuery(),
      emergency_alert: () => this.handleEmergencyAlert(entities),
      cost_analysis: () => this.handleCostAnalysisQuery(entities),
      schedule_pickup: () => this.handleSchedulePickupCommand(entities),
      track_delivery: () => this.handleTrackDeliveryQuery(entities),
      compliance_check: () => this.handleComplianceCheck(entities),
      maintenance_alert: () => this.handleMaintenanceAlert(entities),
      weather_check: () => this.handleWeatherCheck(entities),
      capacity_check: () => this.handleCapacityCheck(entities),
      documentation_status: () => this.handleDocumentationStatus(entities),
      financial_summary: () => this.handleFinancialSummary(entities),
    };

    return responses[intent]();
  }

  private handleShipmentStatusQuery(entities: VoiceEntity[]): VoiceResponse {
    const shipmentEntity = entities.find(e => e.type === 'shipment_id');
    
    if (!shipmentEntity) {
      return {
        type: 'clarification',
        content: "I need a shipment ID to check the status. Could you please provide the shipment number?",
        clarificationQuestions: [
          "What's the shipment ID you'd like me to check?",
          "Do you have the shipment reference number?"
        ],
        audioResponse: "I need a shipment ID to check the status. What shipment would you like me to look up?"
      };
    }

    const mockStatus = this.generateMockShipmentStatus(shipmentEntity.value);
    
    return {
      type: 'data',
      content: `Shipment ${shipmentEntity.value} is currently ${mockStatus.status} at ${mockStatus.location}. ETA is ${mockStatus.eta}.`,
      data: mockStatus,
      audioResponse: `Shipment ${shipmentEntity.value} is ${mockStatus.status} at ${mockStatus.location}. Expected arrival is ${mockStatus.eta}.`,
      visualComponents: [{
        type: 'status',
        data: mockStatus,
        title: 'Shipment Status',
        description: `Real-time status for ${shipmentEntity.value}`
      }]
    };
  }

  private handleCreateShipmentCommand(entities: VoiceEntity[]): VoiceResponse {
    const customerEntity = entities.find(e => e.type === 'customer_name');
    const locationEntity = entities.find(e => e.type === 'location');
    
    if (!customerEntity || !locationEntity) {
      return {
        type: 'clarification',
        content: "To create a shipment, I need the customer name and destination. Can you provide these details?",
        clarificationQuestions: [
          "Who is the customer for this shipment?",
          "What's the destination location?"
        ],
        audioResponse: "I need the customer name and destination to create a new shipment."
      };
    }

    return {
      type: 'action',
      content: `I'll create a new shipment for ${customerEntity.value} to ${locationEntity.value}. Please confirm to proceed.`,
      actions: [{
        actionType: 'create',
        target: 'shipment',
        parameters: {
          customer: customerEntity.value,
          destination: locationEntity.value,
          priority: 'standard'
        },
        confirmation: true,
        description: `Create shipment for ${customerEntity.value} to ${locationEntity.value}`
      }],
      audioResponse: `I can create a new shipment for ${customerEntity.value} to ${locationEntity.value}. Should I proceed?`
    };
  }

  private handleFindVehicleQuery(entities: VoiceEntity[]): VoiceResponse {
    const locationEntity = entities.find(e => e.type === 'location');
    const vehicleEntity = entities.find(e => e.type === 'vehicle_id');

    const vehicles = this.generateMockVehicleData(locationEntity?.value);
    
    return {
      type: 'data',
      content: `Found ${vehicles.length} available vehicles${locationEntity ? ` near ${locationEntity.value}` : ''}. Closest is ${vehicles[0].id} at ${vehicles[0].location}.`,
      data: vehicles,
      audioResponse: `I found ${vehicles.length} available vehicles. The closest one is ${vehicles[0].id} at ${vehicles[0].location}.`,
      visualComponents: [{
        type: 'table',
        data: vehicles,
        title: 'Available Vehicles',
        description: 'Real-time vehicle availability and locations'
      }]
    };
  }

  private handleSystemStatusQuery(): VoiceResponse {
    const systemHealth = {
      overall: 'Healthy',
      activeShipments: 47,
      availableVehicles: 12,
      onTimePerformance: 94.2,
      systemUptime: 99.8,
      alerts: 2,
      issuesResolved: 156
    };

    return {
      type: 'data',
      content: `System is ${systemHealth.overall}. ${systemHealth.activeShipments} active shipments, ${systemHealth.availableVehicles} vehicles available. On-time performance is ${systemHealth.onTimePerformance}%.`,
      data: systemHealth,
      audioResponse: `System status is ${systemHealth.overall}. We have ${systemHealth.activeShipments} active shipments and ${systemHealth.availableVehicles} vehicles available.`,
      visualComponents: [{
        type: 'status',
        data: systemHealth,
        title: 'System Health Dashboard',
        description: 'Current operational status'
      }]
    };
  }

  private handleEmergencyAlert(entities: VoiceEntity[]): VoiceResponse {
    const vehicleEntity = entities.find(e => e.type === 'vehicle_id');
    const locationEntity = entities.find(e => e.type === 'location');

    return {
      type: 'action',
      content: `Emergency alert activated${vehicleEntity ? ` for ${vehicleEntity.value}` : ''}${locationEntity ? ` at ${locationEntity.value}` : ''}. Dispatching emergency response team.`,
      actions: [{
        actionType: 'alert',
        target: 'emergency_services',
        parameters: {
          vehicle: vehicleEntity?.value,
          location: locationEntity?.value,
          priority: 'critical',
          timestamp: new Date().toISOString()
        },
        confirmation: false,
        description: 'Activate emergency response protocol'
      }],
      audioResponse: `Emergency alert has been activated. Emergency services are being notified immediately.`
    };
  }

  private handleRouteOptimizationQuery(entities: VoiceEntity[]): VoiceResponse {
    const locationEntities = entities.filter(e => e.type === 'location');
    
    const optimization = {
      originalRoute: locationEntities.map(e => e.value).join(' → ') || 'Perth → Kalgoorlie',
      optimizedRoute: 'Perth → Merredin → Kalgoorlie',
      timeSaved: '2.5 hours',
      fuelSaved: '45 liters',
      costSaved: 180
    };

    return {
      type: 'data',
      content: `Optimized route saves ${optimization.timeSaved} and ${optimization.fuelSaved} of fuel, reducing costs by $${optimization.costSaved}.`,
      data: optimization,
      audioResponse: `I've optimized your route. The new path saves ${optimization.timeSaved} and reduces fuel consumption by ${optimization.fuelSaved}.`,
      visualComponents: [{
        type: 'map',
        data: optimization,
        title: 'Route Optimization',
        description: 'AI-optimized routing for efficiency'
      }]
    };
  }

  private handleCustomerInquiry(entities: VoiceEntity[]): VoiceResponse {
    const customerEntity = entities.find(e => e.type === 'customer_name');
    
    if (!customerEntity) {
      return {
        type: 'clarification',
        content: "Which customer would you like information about?",
        clarificationQuestions: ["What's the customer name?"],
        audioResponse: "Which customer would you like me to look up?"
      };
    }

    const customerData = this.generateMockCustomerData(customerEntity.value);
    
    return {
      type: 'data',
      content: `${customerEntity.value} has ${customerData.activeShipments} active shipments, ${customerData.totalRevenue} in revenue this month, and a ${customerData.satisfactionScore}% satisfaction score.`,
      data: customerData,
      audioResponse: `${customerEntity.value} has ${customerData.activeShipments} active shipments and a satisfaction score of ${customerData.satisfactionScore} percent.`,
      visualComponents: [{
        type: 'chart',
        data: customerData,
        title: 'Customer Overview',
        description: `Performance metrics for ${customerEntity.value}`
      }]
    };
  }

  // Additional handlers for remaining intents
  private handleUpdateShipmentCommand(entities: VoiceEntity[]): VoiceResponse {
    const shipmentEntity = entities.find(e => e.type === 'shipment_id');
    
    return {
      type: 'action',
      content: `Ready to update shipment ${shipmentEntity?.value || '[ID needed]'}. What changes would you like to make?`,
      actions: [{
        actionType: 'navigate',
        target: `/shipments/${shipmentEntity?.value || 'search'}`,
        parameters: {},
        confirmation: false,
        description: 'Navigate to shipment update form'
      }],
      audioResponse: "I can help update the shipment. What changes do you need to make?"
    };
  }

  private handleGenerateReportCommand(entities: VoiceEntity[]): VoiceResponse {
    return {
      type: 'action',
      content: "I'll generate a comprehensive operations report for you.",
      actions: [{
        actionType: 'navigate',
        target: '/reports',
        parameters: { autoGenerate: true },
        confirmation: true,
        description: 'Generate and download operations report'
      }],
      audioResponse: "I'll prepare a comprehensive operations report. This will take a moment."
    };
  }

  private handleDriverStatusQuery(entities: VoiceEntity[]): VoiceResponse {
    const driverData = {
      activeDrivers: 23,
      availableDrivers: 8,
      driversOnBreak: 5,
      averageHours: 7.2,
      complianceRate: 98.5
    };

    return {
      type: 'data',
      content: `${driverData.activeDrivers} drivers active, ${driverData.availableDrivers} available. Compliance rate is ${driverData.complianceRate}%.`,
      data: driverData,
      audioResponse: `We have ${driverData.activeDrivers} active drivers with ${driverData.availableDrivers} available for new assignments.`
    };
  }

  private handleCostAnalysisQuery(entities: VoiceEntity[]): VoiceResponse {
    const costData = {
      monthlyRevenue: 485000,
      monthlyExpenses: 312000,
      profit: 173000,
      profitMargin: 35.7,
      fuelCosts: 89000,
      maintenanceCosts: 23000
    };

    return {
      type: 'data',
      content: `Monthly profit is $${costData.profit.toLocaleString()} with a ${costData.profitMargin}% margin. Fuel costs: $${costData.fuelCosts.toLocaleString()}.`,
      data: costData,
      audioResponse: `This month's profit is $${costData.profit.toLocaleString()} with a profit margin of ${costData.profitMargin} percent.`
    };
  }

  private handleSchedulePickupCommand(entities: VoiceEntity[]): VoiceResponse {
    return {
      type: 'action',
      content: "I'll help schedule a pickup. Let me open the booking form for you.",
      actions: [{
        actionType: 'navigate',
        target: '/shipments/new',
        parameters: { type: 'pickup' },
        confirmation: false,
        description: 'Open new pickup booking form'
      }],
      audioResponse: "I'll open the pickup scheduling form for you."
    };
  }

  private handleTrackDeliveryQuery(entities: VoiceEntity[]): VoiceResponse {
    const shipmentEntity = entities.find(e => e.type === 'shipment_id');
    
    if (!shipmentEntity) {
      return {
        type: 'clarification',
        content: "Which delivery would you like me to track?",
        audioResponse: "Which shipment would you like me to track?"
      };
    }

    const tracking = {
      shipmentId: shipmentEntity.value,
      currentLocation: 'Northam, WA',
      nextStop: 'Merredin, WA',
      eta: '3:45 PM today',
      progress: 65
    };

    return {
      type: 'data',
      content: `${shipmentEntity.value} is ${tracking.progress}% complete, currently at ${tracking.currentLocation}. ETA: ${tracking.eta}.`,
      data: tracking,
      audioResponse: `Your delivery is ${tracking.progress} percent complete and currently at ${tracking.currentLocation}. Expected arrival is ${tracking.eta}.`
    };
  }

  private handleComplianceCheck(entities: VoiceEntity[]): VoiceResponse {
    const compliance = {
      overallScore: 96.2,
      driverHours: 'Compliant',
      vehicleInspections: 'Up to date',
      documentation: '2 items pending',
      certifications: 'Current'
    };

    return {
      type: 'data',
      content: `Compliance score: ${compliance.overallScore}%. Driver hours: ${compliance.driverHours}. ${compliance.documentation}.`,
      data: compliance,
      audioResponse: `Overall compliance score is ${compliance.overallScore} percent. Driver hours are compliant and vehicle inspections are up to date.`
    };
  }

  private handleMaintenanceAlert(entities: VoiceEntity[]): VoiceResponse {
    const vehicleEntity = entities.find(e => e.type === 'vehicle_id');
    
    return {
      type: 'action',
      content: `Maintenance alert logged${vehicleEntity ? ` for ${vehicleEntity.value}` : ''}. Scheduling inspection.`,
      actions: [{
        actionType: 'create',
        target: 'maintenance_request',
        parameters: { vehicle: vehicleEntity?.value, priority: 'high' },
        confirmation: true,
        description: 'Create maintenance request'
      }],
      audioResponse: "Maintenance alert has been logged. I'll schedule an inspection."
    };
  }

  private handleWeatherCheck(entities: VoiceEntity[]): VoiceResponse {
    const locationEntity = entities.find(e => e.type === 'location');
    const location = locationEntity?.value || 'Perth';
    
    const weather = {
      location,
      condition: 'Partly cloudy',
      temperature: 24,
      windSpeed: 15,
      visibility: 'Good',
      transportImpact: 'Minimal'
    };

    return {
      type: 'data',
      content: `Weather in ${location}: ${weather.condition}, ${weather.temperature}°C. Transport impact: ${weather.transportImpact}.`,
      data: weather,
      audioResponse: `Weather in ${location} is ${weather.condition} at ${weather.temperature} degrees with minimal transport impact.`
    };
  }

  private handleCapacityCheck(entities: VoiceEntity[]): VoiceResponse {
    const capacity = {
      totalCapacity: 850,
      currentLoad: 620,
      availableCapacity: 230,
      utilizationRate: 72.9,
      nextAvailable: '2 hours'
    };

    return {
      type: 'data',
      content: `Current capacity utilization: ${capacity.utilizationRate}%. Available capacity: ${capacity.availableCapacity} tonnes.`,
      data: capacity,
      audioResponse: `Current capacity utilization is ${capacity.utilizationRate} percent with ${capacity.availableCapacity} tonnes available.`
    };
  }

  private handleDocumentationStatus(entities: VoiceEntity[]): VoiceResponse {
    const documentation = {
      completed: 145,
      pending: 8,
      overdue: 2,
      complianceRate: 94.8,
      nextDeadline: 'DG certificates due Friday'
    };

    return {
      type: 'data',
      content: `Documentation: ${documentation.completed} completed, ${documentation.pending} pending, ${documentation.overdue} overdue. ${documentation.nextDeadline}.`,
      data: documentation,
      audioResponse: `We have ${documentation.pending} pending documents and ${documentation.overdue} overdue items. ${documentation.nextDeadline}.`
    };
  }

  private handleFinancialSummary(entities: VoiceEntity[]): VoiceResponse {
    const financial = {
      monthlyRevenue: 485000,
      outstandingPayments: 67000,
      cashFlow: 156000,
      profitability: 35.7,
      trends: 'Positive growth'
    };

    return {
      type: 'data',
      content: `Monthly revenue: $${financial.monthlyRevenue.toLocaleString()}. Outstanding payments: $${financial.outstandingPayments.toLocaleString()}. Cash flow: $${financial.cashFlow.toLocaleString()}.`,
      data: financial,
      audioResponse: `Monthly revenue is $${financial.monthlyRevenue.toLocaleString()} with $${financial.outstandingPayments.toLocaleString()} in outstanding payments.`
    };
  }

  // Helper methods for generating mock data
  private generateMockShipmentStatus(shipmentId: string) {
    const statuses = ['In Transit', 'Loading', 'Delivered', 'Delayed', 'At Depot'];
    const locations = ['Perth', 'Kalgoorlie', 'Port Hedland', 'Fremantle', 'Geraldton'];
    
    return {
      shipmentId,
      status: statuses[Math.floor(this.seededRandom() * statuses.length)],
      location: locations[Math.floor(this.seededRandom() * locations.length)],
      eta: new Date(Date.now() + this.seededRandom() * 24 * 60 * 60 * 1000).toLocaleDateString(),
      progress: Math.floor(this.seededRandom() * 100),
      driver: 'John Smith',
      vehicle: `TRK-${Math.floor(this.seededRandom() * 100).toString().padStart(3, '0')}`
    };
  }

  private generateMockVehicleData(nearLocation?: string) {
    const vehicles = [];
    const count = Math.floor(this.seededRandom() * 5) + 3;
    
    for (let i = 0; i < count; i++) {
      vehicles.push({
        id: `TRK-${Math.floor(this.seededRandom() * 100).toString().padStart(3, '0')}`,
        location: nearLocation || ['Perth', 'Kalgoorlie', 'Fremantle'][Math.floor(this.seededRandom() * 3)],
        status: 'Available',
        capacity: `${Math.floor(this.seededRandom() * 50) + 20} tonnes`,
        driver: 'Available',
        nextMaintenance: '2 weeks'
      });
    }
    
    return vehicles;
  }

  private generateMockCustomerData(customerName: string) {
    return {
      name: customerName,
      activeShipments: Math.floor(this.seededRandom() * 10) + 2,
      totalRevenue: `$${(Math.floor(this.seededRandom() * 100000) + 50000).toLocaleString()}`,
      satisfactionScore: Math.floor(this.seededRandom() * 20) + 80,
      paymentStatus: 'Current',
      preferredRoutes: 3,
      avgDeliveryTime: '4.2 days'
    };
  }

  // Get available voice capabilities
  getVoiceCapabilities(): VoiceCapability[] {
    return [
      {
        intent: 'shipment_status',
        description: 'Check the status and location of shipments',
        examples: ['Where is shipment SH-2024-1001?', 'Status of my delivery', 'Track shipment'],
        requiredEntities: ['shipment_id'],
        optionalEntities: ['date'],
        permissions: ['shipments.read']
      },
      {
        intent: 'find_vehicle',
        description: 'Find available vehicles and their locations',
        examples: ['Find nearest vehicle', 'Available trucks in Perth', 'Vehicle TRK-045 location'],
        requiredEntities: [],
        optionalEntities: ['location', 'vehicle_id'],
        permissions: ['fleet.read']
      },
      {
        intent: 'system_status',
        description: 'Get overall system health and operational status',
        examples: ['System status', 'How are operations?', 'Health check'],
        requiredEntities: [],
        optionalEntities: [],
        permissions: ['system.read']
      },
      {
        intent: 'emergency_alert',
        description: 'Activate emergency protocols and alerts',
        examples: ['Emergency', 'Vehicle breakdown', 'Need help with TRK-023'],
        requiredEntities: [],
        optionalEntities: ['vehicle_id', 'location'],
        permissions: ['emergency.create']
      },
    ];
  }

  // Get recent voice commands for analytics
  getRecentCommands(limit: number = 10): VoiceCommand[] {
    if (!this.currentSession) return [];
    
    return this.currentSession.commands
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Get voice usage analytics
  getVoiceAnalytics() {
    if (!this.currentSession) {
      return {
        totalCommands: 0,
        avgConfidence: 0,
        avgExecutionTime: 0,
        successRate: 0,
        popularIntents: [],
        sessionsToday: 0
      };
    }

    const commands = this.currentSession.commands;
    const successful = commands.filter(c => c.status === 'completed');
    
    return {
      totalCommands: commands.length,
      avgConfidence: commands.reduce((sum, c) => sum + c.confidence, 0) / commands.length,
      avgExecutionTime: commands.reduce((sum, c) => sum + c.executionTime, 0) / commands.length,
      successRate: (successful.length / commands.length) * 100,
      popularIntents: this.getPopularIntents(commands),
      sessionsToday: 1 // Simplified for demo
    };
  }

  private getPopularIntents(commands: VoiceCommand[]) {
    const intentCounts = commands.reduce((acc, cmd) => {
      acc[cmd.intent] = (acc[cmd.intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(intentCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([intent, count]) => ({ intent, count }));
  }
}

export const voiceInterfaceService = new VoiceInterfaceService();