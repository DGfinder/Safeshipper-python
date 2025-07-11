'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  Zap,
  Shield,
  TrendingUp,
  AlertTriangle,
  Activity,
  Thermometer,
  MapPin,
  Truck,
  Clock,
  Target,
  BarChart3,
  Wifi,
  Battery,
  Satellite,
  Eye,
  RefreshCw,
  Users,
  Globe,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  FileText
} from 'lucide-react';
import { 
  predictiveRiskAnalyticsService, 
  type RiskFactor, 
  type RouteRiskAssessment 
} from '@/services/predictiveRiskAnalyticsService';
import { 
  iotSmartContainerService, 
  type ContainerAlert, 
  type ContainerSensorData,
  type ContainerFleetAnalytics
} from '@/services/iotSmartContainerService';
import {
  computerVisionSafetyService,
  type PPEDetectionResult,
  type ProximityAlert,
  type SafetyAnalytics
} from '@/services/computerVisionSafetyService';
import {
  regulatoryComplianceService,
  type RegulationUpdate,
  type ComplianceMetrics
} from '@/services/regulatoryComplianceService';

interface AIInsightsDashboardProps {
  className?: string;
}

interface LiveMetrics {
  totalShipments: number;
  activeContainers: number;
  riskAlertsCount: number;
  complianceScore: number;
  predictedDisruptions: number;
  costSavings: number;
  co2Reduction: number;
  safetyIncidents: number;
}

export default function AIInsightsDashboard({ className = '' }: AIInsightsDashboardProps) {
  const [activeRiskFactors, setActiveRiskFactors] = useState<RiskFactor[]>([]);
  const [containerAlerts, setContainerAlerts] = useState<ContainerAlert[]>([]);
  const [fleetAnalytics, setFleetAnalytics] = useState<ContainerFleetAnalytics | null>(null);
  const [safetyAlerts, setSafetyAlerts] = useState<(ProximityAlert | any)[]>([]);
  const [ppeViolations, setPPEViolations] = useState<PPEDetectionResult[]>([]);
  const [safetyAnalytics, setSafetyAnalytics] = useState<SafetyAnalytics | null>(null);
  const [regulationUpdates, setRegulationUpdates] = useState<RegulationUpdate[]>([]);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetrics | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    totalShipments: 2847,
    activeContainers: 156,
    riskAlertsCount: 7,
    complianceScore: 98.7,
    predictedDisruptions: 3,
    costSavings: 247500,
    co2Reduction: 1240,
    safetyIncidents: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    // Initialize real-time monitoring
    const initializeMonitoring = async () => {
      await predictiveRiskAnalyticsService.initializeRealTimeMonitoring();
      await computerVisionSafetyService.initializeRealtimeMonitoring('facility-001', ['cam-001', 'cam-002']);
      await regulatoryComplianceService.initializeRegulationMonitoring();
      
      // Subscribe to risk updates
      const unsubscribeRisk = predictiveRiskAnalyticsService.subscribeToRiskUpdates((riskFactor) => {
        setActiveRiskFactors(prev => {
          const filtered = prev.filter(rf => rf.id !== riskFactor.id);
          return [...filtered, riskFactor].slice(-10); // Keep last 10
        });
      });

      // Subscribe to container alerts
      const unsubscribeAlerts = iotSmartContainerService.subscribeToContainerAlerts((alert) => {
        setContainerAlerts(prev => {
          const filtered = prev.filter(a => a.alertId !== alert.alertId);
          return [...filtered, alert].slice(-15); // Keep last 15
        });
      });

      // Subscribe to safety alerts
      const unsubscribeSafety = computerVisionSafetyService.subscribeToSafetyAlerts((alert) => {
        setSafetyAlerts(prev => {
          const filtered = prev.filter(a => (a as any).alertId !== (alert as any).alertId);
          return [...filtered, alert].slice(-10); // Keep last 10
        });
      });

      // Subscribe to PPE violations
      const unsubscribePPE = computerVisionSafetyService.subscribeToPPEViolations((violation) => {
        setPPEViolations(prev => {
          const filtered = prev.filter(v => v.personId !== violation.personId);
          return [...filtered, violation].slice(-5); // Keep last 5
        });
      });

      // Subscribe to regulation updates
      const unsubscribeRegulation = regulatoryComplianceService.subscribeToRegulationUpdates((update) => {
        setRegulationUpdates(prev => {
          const filtered = prev.filter(u => u.updateId !== update.updateId);
          return [...filtered, update].slice(-8); // Keep last 8
        });
      });

      // Load initial data
      loadFleetAnalytics();
      loadSafetyAnalytics();
      loadComplianceMetrics();
      loadInitialRiskFactors();
      loadInitialAlerts();
      loadInitialSafetyData();
      loadInitialRegulationUpdates();

      return () => {
        unsubscribeRisk();
        unsubscribeAlerts();
        unsubscribeSafety();
        unsubscribePPE();
        unsubscribeRegulation();
      };
    };

    initializeMonitoring();

    // Simulate real-time metric updates
    const metricsInterval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        totalShipments: prev.totalShipments + Math.floor(Math.random() * 3),
        activeContainers: prev.activeContainers + Math.floor(Math.random() * 2) - 1,
        riskAlertsCount: Math.max(0, prev.riskAlertsCount + Math.floor(Math.random() * 3) - 1),
        complianceScore: Math.min(100, prev.complianceScore + (Math.random() - 0.5) * 0.1),
        costSavings: prev.costSavings + Math.floor(Math.random() * 1000)
      }));
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(metricsInterval);
      predictiveRiskAnalyticsService.disconnect();
      iotSmartContainerService.disconnect();
      computerVisionSafetyService.disconnect();
      regulatoryComplianceService.disconnect();
    };
  }, []);

  const loadFleetAnalytics = async () => {
    try {
      const analytics = await iotSmartContainerService.getFleetAnalytics('month');
      if (analytics) {
        setFleetAnalytics(analytics);
      }
    } catch (error) {
      console.error('Failed to load fleet analytics:', error);
    }
  };

  const loadSafetyAnalytics = async () => {
    try {
      const analytics = await computerVisionSafetyService.getSafetyAnalytics('facility-001', 'day');
      if (analytics) {
        setSafetyAnalytics(analytics);
      }
    } catch (error) {
      console.error('Failed to load safety analytics:', error);
    }
  };

  const loadComplianceMetrics = async () => {
    try {
      const metrics = await regulatoryComplianceService.getComplianceMetrics('month');
      if (metrics) {
        setComplianceMetrics(metrics);
      }
    } catch (error) {
      console.error('Failed to load compliance metrics:', error);
    }
  };

  const loadInitialRiskFactors = () => {
    // Simulate initial risk factors
    const mockRiskFactors: RiskFactor[] = [
      {
        id: 'weather-001',
        type: 'weather',
        severity: 'medium',
        confidence: 0.89,
        description: 'Heavy rain forecast affecting Melbourne-Sydney corridor',
        detectedAt: new Date().toISOString(),
        predictedImpact: {
          probability: 0.75,
          timeframe: '6h',
          affectedRoutes: ['MEL-SYD-01', 'MEL-SYD-02'],
          potentialDisruption: 'Delays up to 2 hours',
          recommendedActions: ['Delay departure by 3 hours', 'Use alternative inland route']
        },
        dataSource: 'Bureau of Meteorology'
      },
      {
        id: 'traffic-001',
        type: 'traffic',
        severity: 'low',
        confidence: 0.95,
        description: 'Minor road works on M1 causing slow traffic',
        detectedAt: new Date(Date.now() - 600000).toISOString(),
        predictedImpact: {
          probability: 0.90,
          timeframe: '24h',
          affectedRoutes: ['M1-CORRIDOR'],
          potentialDisruption: 'Additional 30 minutes travel time',
          recommendedActions: ['Use M7 alternative route', 'Schedule outside peak hours']
        },
        dataSource: 'Traffic Management System'
      }
    ];
    setActiveRiskFactors(mockRiskFactors);
  };

  const loadInitialAlerts = () => {
    // Simulate initial container alerts
    const mockAlerts: ContainerAlert[] = [
      {
        alertId: 'alert-001',
        containerId: 'CONT-12345',
        alertType: 'threshold_exceeded',
        severity: 'warning',
        title: 'Temperature Threshold Exceeded',
        description: 'Container temperature has exceeded maximum threshold for refrigerated cargo',
        triggeredAt: new Date(Date.now() - 300000).toISOString(),
        sensorData: {
          parameter: 'temperature',
          currentValue: 8.2,
          thresholdValue: 8.0,
          trend: 'increasing'
        },
        location: {
          latitude: -37.8136,
          longitude: 144.9631,
          address: 'M1 Freeway, Melbourne VIC'
        },
        recommendedActions: [
          'Check refrigeration unit status',
          'Verify door seal integrity',
          'Contact driver for immediate inspection'
        ],
        escalationLevel: 1,
        affectedCargo: {
          unNumbers: ['UN1942'],
          estimatedRisk: 'medium',
          potentialConsequences: ['Product quality degradation', 'Regulatory compliance risk']
        },
        relatedAlerts: []
      }
    ];
    setContainerAlerts(mockAlerts);
  };

  const loadInitialSafetyData = () => {
    // Simulate initial safety alerts
    const mockSafetyAlerts: ProximityAlert[] = [
      {
        alertId: 'safety-001',
        alertType: 'person_to_vehicle',
        severity: 'medium',
        personId: 'worker-001',
        targetId: 'truck-123',
        distance: 2.8,
        minimumSafeDistance: 3.0,
        location: {
          camera: 'cam-001',
          coordinates: { x: 150, y: 200 },
          facility: 'Main Warehouse',
          zone: 'Loading Dock A'
        },
        timestamp: new Date(Date.now() - 180000).toISOString(),
        resolved: false,
        actionsTaken: []
      }
    ];
    setSafetyAlerts(mockSafetyAlerts);

    // Simulate PPE violations
    const mockPPEViolations: PPEDetectionResult[] = [
      {
        personId: 'worker-002',
        confidence: 0.91,
        boundingBox: { x: 100, y: 50, width: 80, height: 200 },
        detectedPPE: {
          hardHat: { detected: true, confidence: 0.95, color: 'yellow' },
          safetyVest: { detected: true, confidence: 0.89, color: 'orange' },
          safetyGloves: { detected: false, confidence: 0.25 },
          safetyBoots: { detected: true, confidence: 0.87 },
          respirator: { detected: false, confidence: 0.15 },
          eyeProtection: { detected: true, confidence: 0.93, type: 'safety_glasses' },
          hearingProtection: { detected: false, confidence: 0.18 }
        },
        requiredPPE: ['hardHat', 'safetyVest', 'safetyGloves', 'eyeProtection'],
        complianceStatus: 'non_compliant',
        violations: ['Missing safety gloves required for hazmat handling'],
        timestamp: new Date(Date.now() - 120000).toISOString()
      }
    ];
    setPPEViolations(mockPPEViolations);
  };

  const loadInitialRegulationUpdates = () => {
    // Simulate regulation updates
    const mockUpdates: RegulationUpdate[] = [
      {
        updateId: 'reg-001',
        regulatoryBody: 'IMDG',
        updateType: 'amendment',
        severity: 'major',
        title: 'Updated lithium battery transport requirements',
        description: 'New packaging and labeling requirements for lithium batteries effective January 2025',
        affectedSections: ['2.9.4', '4.1.5'],
        affectedUnNumbers: ['UN3480', 'UN3481'],
        affectedHazardClasses: ['9'],
        affectedTransportModes: ['sea', 'air'],
        effectiveDate: '2025-01-01T00:00:00Z',
        complianceDeadline: '2025-03-01T00:00:00Z',
        implementationPeriod: '60 days',
        geographicScope: ['Global'],
        changeDetails: {
          newRequirement: 'Enhanced fire suppression systems required for lithium battery shipments',
          rationale: 'Increased fire incidents during transport',
          complianceActions: ['Update procedures', 'Train staff', 'Upgrade equipment']
        },
        businessImpact: {
          impactLevel: 'high',
          affectedOperations: ['Packaging', 'Documentation'],
          estimatedCost: 15000,
          implementationTime: 45,
          trainingRequired: true
        },
        sources: ['IMO MSC.105/21'],
        relatedUpdates: [],
        lastModified: new Date().toISOString()
      }
    ];
    setRegulationUpdates(mockUpdates);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadFleetAnalytics(),
        loadSafetyAnalytics(),
        loadComplianceMetrics(),
        new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'text-red-600 bg-red-100 border-red-300';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-3 w-3 text-green-600" />;
    if (value < 0) return <ArrowDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-600" />;
  };

  return (
    <div className={`p-6 space-y-6 bg-gray-50 min-h-screen ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#153F9F] rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Insights Dashboard</h1>
            <p className="text-gray-600">Real-time intelligence for dangerous goods transport</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
            <Wifi className="h-3 w-3 mr-1" />
            Live Monitoring
          </Badge>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-[#153F9F]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Shipments</p>
                <p className="text-2xl font-bold text-gray-900">{liveMetrics.totalShipments.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(0.8)}
                  <span className="text-xs text-gray-500">+0.8% vs yesterday</span>
                </div>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-5 w-5 text-[#153F9F]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Smart Containers</p>
                <p className="text-2xl font-bold text-gray-900">{liveMetrics.activeContainers}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(2.1)}
                  <span className="text-xs text-gray-500">+2.1% this week</span>
                </div>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Risk Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{liveMetrics.riskAlertsCount}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(-1.2)}
                  <span className="text-xs text-gray-500">-1.2% vs last month</span>
                </div>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compliance Score</p>
                <p className="text-2xl font-bold text-gray-900">{liveMetrics.complianceScore.toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(0.3)}
                  <span className="text-xs text-gray-500">+0.3% improvement</span>
                </div>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI-Powered Cost Savings Banner */}
      <Card className="bg-gradient-to-r from-[#153F9F] to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Brain className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI-Powered Optimization Savings</h3>
                <p className="text-blue-100">Predictive analytics and smart routing this month</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">${liveMetrics.costSavings.toLocaleString()}</p>
              <p className="text-blue-100">15.7% improvement over last month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="risk-analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="risk-analytics">Predictive Risk</TabsTrigger>
          <TabsTrigger value="smart-containers">Smart IoT</TabsTrigger>
          <TabsTrigger value="safety-monitoring">Safety Vision</TabsTrigger>
          <TabsTrigger value="compliance">Compliance AI</TabsTrigger>
          <TabsTrigger value="fleet-performance">Fleet Performance</TabsTrigger>
          <TabsTrigger value="insights">Strategic Insights</TabsTrigger>
        </TabsList>

        {/* Predictive Risk Analytics Tab */}
        <TabsContent value="risk-analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Active Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeRiskFactors.length > 0 ? (
                  activeRiskFactors.map((factor) => (
                    <div key={factor.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getSeverityColor(factor.severity)}>
                          {factor.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">{factor.confidence * 100}% confidence</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{factor.description}</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Impact: {factor.predictedImpact.potentialDisruption}
                      </p>
                      <div className="text-xs text-gray-500">
                        Source: {factor.dataSource} • {new Date(factor.detectedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
                    <p className="text-gray-600">No active risk factors detected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Route Optimization Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Route Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Optimal Route Suggested</span>
                  </div>
                  <p className="text-sm text-green-700 mb-2">
                    Alternative route via M7 reduces risk by 25% and saves 2 hours
                  </p>
                  <div className="flex items-center justify-between text-xs text-green-600">
                    <span>Cost savings: $340</span>
                    <span>CO₂ reduction: 15kg</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Optimal Departure Window</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">
                    Schedule departure between 2:00 AM - 6:00 AM for lowest risk
                  </p>
                  <div className="text-xs text-blue-600">
                    Traffic reduction: 60% • Weather risk: Minimal
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Enhanced Precautions</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Recommend reinforced containers for hazard class 5.1 cargo
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Predictive Disruption Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Predicted Disruptions Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="p-2 bg-yellow-100 rounded">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Next 6 hours</div>
                    <div className="text-sm text-gray-600">Heavy rain expected in Melbourne-Sydney corridor</div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">75% probability</Badge>
                </div>

                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="p-2 bg-orange-100 rounded">
                    <Truck className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Next 24 hours</div>
                    <div className="text-sm text-gray-600">Peak traffic congestion during morning rush</div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">90% probability</Badge>
                </div>

                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="p-2 bg-blue-100 rounded">
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Next 7 days</div>
                    <div className="text-sm text-gray-600">Vehicle CONT-789 requires brake maintenance</div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">65% probability</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Container IoT Tab */}
        <TabsContent value="smart-containers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Container Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Live Container Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {containerAlerts.length > 0 ? (
                  containerAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.alertId} className={`border rounded-lg p-4 ${getAlertSeverityColor(alert.severity)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">{alert.containerId}</span>
                        </div>
                        <MapPin className="h-4 w-4 text-gray-500" />
                      </div>
                      <h4 className="font-medium mb-1">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span>
                          {alert.sensorData.parameter}: {alert.sensorData.currentValue}
                          {alert.sensorData.parameter === 'temperature' ? '°C' : ''}
                        </span>
                        <span className="text-gray-500">
                          {new Date(alert.triggeredAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Systems Normal</h3>
                    <p className="text-gray-600">No active container alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Real-time Sensor Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-blue-600" />
                  Real-time Sensor Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Temperature</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">4.2°C</p>
                    <p className="text-xs text-gray-500">Within range (2-8°C)</p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Humidity</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">65%</p>
                    <p className="text-xs text-gray-500">Optimal range</p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Battery className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">Battery</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">78%</p>
                    <p className="text-xs text-gray-500">168h remaining</p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Satellite className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Signal</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">-75dBm</p>
                    <p className="text-xs text-gray-500">Excellent</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">Container CONT-12345</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Last GPS update: 2 minutes ago</p>
                    <p>• Door status: Sealed and secure</p>
                    <p>• Estimated arrival: 14:30 (on time)</p>
                    <p>• Cargo: UN1942 (Ammonium Nitrate)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Safety Vision Tab */}
        <TabsContent value="safety-monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Safety Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-red-600" />
                  Live Safety Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {safetyAlerts.length > 0 ? (
                  safetyAlerts.map((alert) => (
                    <div key={alert.alertId} className="border rounded-lg p-4 border-yellow-200 bg-yellow-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">{alert.alertType.replace('_', ' ')}</span>
                        </div>
                        <MapPin className="h-4 w-4 text-gray-500" />
                      </div>
                      <h4 className="font-medium mb-1">Proximity Alert: {alert.targetId}</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Distance: {alert.distance}m (Min: {alert.minimumSafeDistance}m)
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span>{alert.location.zone}</span>
                        <span className="text-gray-500">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Safe!</h3>
                    <p className="text-gray-600">No active safety alerts detected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PPE Compliance Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  PPE Compliance Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {safetyAnalytics && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{safetyAnalytics.metrics.ppeComplianceRate.toFixed(1)}%</div>
                      <p className="text-sm text-green-700">PPE Compliance</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{safetyAnalytics.overallSafetyScore}</div>
                      <p className="text-sm text-blue-700">Safety Score</p>
                    </div>
                  </div>
                )}

                {ppeViolations.length > 0 ? (
                  ppeViolations.map((violation, index) => (
                    <div key={violation.personId} className="border rounded-lg p-4 border-red-200 bg-red-50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-red-100 text-red-800">
                          PPE VIOLATION
                        </Badge>
                        <span className="text-xs text-gray-500">{violation.confidence * 100}% confidence</span>
                      </div>
                      <h4 className="font-medium mb-1">Worker {violation.personId}</h4>
                      <div className="text-sm text-gray-600 mb-2">
                        {violation.violations.map(v => (
                          <p key={v}>• {v}</p>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(violation.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">All personnel PPE compliant</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Safety Analytics Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Safety Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <p className="text-sm text-gray-600">Safety Incidents Today</p>
                </div>
                <div className="text-center">
                  <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">24/7</div>
                  <p className="text-sm text-gray-600">Camera Monitoring</p>
                </div>
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">3</div>
                  <p className="text-sm text-gray-600">Active Alerts</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">+15%</div>
                  <p className="text-sm text-gray-600">Safety Improvement</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance AI Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Regulation Updates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Live Regulation Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {regulationUpdates.length > 0 ? (
                  regulationUpdates.map((update) => (
                    <div key={update.updateId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getSeverityColor(update.severity)}>
                          {update.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">{update.regulatoryBody}</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{update.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{update.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Effective: {new Date(update.effectiveDate).toLocaleDateString()}</span>
                        <span>Impact: {update.businessImpact.impactLevel}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Up to Date!</h3>
                    <p className="text-gray-600">No new regulation updates</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Automated Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {complianceMetrics && (
                  <>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{complianceMetrics.overallComplianceRate.toFixed(1)}%</div>
                      <p className="text-sm text-green-700">Overall Compliance Rate</p>
                      <div className="flex items-center justify-center gap-1 mt-2">
                        {getTrendIcon(1.2)}
                        <span className="text-xs text-gray-500">+1.2% this month</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-xl font-bold text-blue-600">{complianceMetrics.automationEfficiency.toFixed(1)}%</div>
                        <p className="text-xs text-gray-600">Automation Rate</p>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-xl font-bold text-purple-600">{complianceMetrics.metrics.timeSavings}</div>
                        <p className="text-xs text-gray-600">Hours Saved</p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium text-blue-800 mb-2">AI-Powered Cost Savings</h4>
                      <div className="text-2xl font-bold text-blue-600">${complianceMetrics.metrics.costSavings.toLocaleString()}</div>
                      <p className="text-sm text-blue-700">Saved through automation this month</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Compliance Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Compliance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">98.7%</div>
                  <p className="text-sm text-gray-600">Documents Auto-Generated</p>
                </div>
                <div className="text-center">
                  <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">2.3min</div>
                  <p className="text-sm text-gray-600">Average Processing Time</p>
                </div>
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">2</div>
                  <p className="text-sm text-gray-600">Pending Updates</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">95%</div>
                  <p className="text-sm text-gray-600">Error Reduction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fleet Performance Tab */}
        <TabsContent value="fleet-performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Fleet Utilization</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-[#153F9F] mb-2">87.3%</div>
                <p className="text-gray-600">Above industry average of 75%</p>
                <div className="mt-4 flex items-center justify-center gap-1">
                  {getTrendIcon(2.1)}
                  <span className="text-sm text-gray-500">+2.1% this month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">On-Time Performance</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">94.7%</div>
                <p className="text-gray-600">Target: 95%</p>
                <div className="mt-4 flex items-center justify-center gap-1">
                  {getTrendIcon(1.3)}
                  <span className="text-sm text-gray-500">+1.3% improvement</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Safety Score</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">99.1%</div>
                <p className="text-gray-600">Industry leading</p>
                <div className="mt-4 flex items-center justify-center gap-1">
                  {getTrendIcon(0.2)}
                  <span className="text-sm text-gray-500">+0.2% this quarter</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fleet Environmental Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Globe className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{liveMetrics.co2Reduction}kg</div>
                  <p className="text-sm text-gray-600">CO₂ Reduced This Month</p>
                </div>
                <div className="text-center">
                  <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">12.3L</div>
                  <p className="text-sm text-gray-600">Fuel Saved per 100km</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">85/100</div>
                  <p className="text-sm text-gray-600">Sustainability Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-[#153F9F]" />
                  AI Predictions & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-blue-800 mb-2">Route Optimization Insight</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    AI analysis suggests alternative routing could reduce dangerous goods transport risks by 30% 
                    while maintaining on-time delivery performance.
                  </p>
                  <Badge className="bg-blue-100 text-blue-800">Confidence: 92%</Badge>
                </div>

                <div className="border rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-800 mb-2">Predictive Maintenance</h4>
                  <p className="text-sm text-green-700 mb-2">
                    3 containers scheduled for maintenance next week. Proactive scheduling 
                    prevents 85% of unexpected breakdowns.
                  </p>
                  <Badge className="bg-green-100 text-green-800">Cost Savings: $15,400</Badge>
                </div>

                <div className="border rounded-lg p-4 bg-purple-50">
                  <h4 className="font-medium text-purple-800 mb-2">Compliance Automation</h4>
                  <p className="text-sm text-purple-700 mb-2">
                    Automated regulatory compliance checking detected and prevented 12 
                    potential violations this month.
                  </p>
                  <Badge className="bg-purple-100 text-purple-800">Risk Reduction: 95%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Industry Benchmarking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Safety Performance</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                      </div>
                      <span className="text-sm text-green-600">Top 5%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">On-Time Delivery</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                      <span className="text-sm text-blue-600">Top 12%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cost Efficiency</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                      <span className="text-sm text-purple-600">Top 8%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sustainability</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                      <span className="text-sm text-green-600">Top 15%</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    Your organization ranks in the <strong>top 10%</strong> of dangerous goods 
                    transport companies globally, with exceptional performance in AI-driven 
                    safety management and predictive analytics.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Strategic Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-[#153F9F]" />
                    <span className="font-medium">Expand Smart Container Fleet</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Increasing IoT-enabled containers by 25% could improve monitoring coverage to 95% 
                    and reduce temperature excursion incidents by an estimated 40%.
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-600">ROI: 18 months</span>
                    <span className="text-blue-600">Risk reduction: 40%</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Advanced AI Route Planning</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Implementing machine learning-based dynamic routing could optimize delivery 
                    schedules and reduce fuel consumption by 12-15%.
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-600">Cost savings: $280k/year</span>
                    <span className="text-green-600">CO₂ reduction: 15%</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">Regulatory Compliance Automation</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Full automation of compliance checking across all transport modes could 
                    eliminate manual errors and reduce compliance staff workload by 60%.
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-600">Efficiency gain: 60%</span>
                    <span className="text-blue-600">Error reduction: 95%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}