'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useTheme } from '@/contexts/ThemeContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';
import { formatDistance, format } from 'date-fns';
import {
  MapPin,
  Truck,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Thermometer,
  Activity,
  Shield,
  FileText,
  Camera,
  Download,
  Share2,
  Bell,
  RefreshCw,
  Route,
  Gauge,
  Zap,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  AlertCircle,
  Info,
  Calendar,
  User,
  Phone,
  MessageSquare,
  Star,
  Eye,
  ExternalLink,
  Play,
  Pause,
  BarChart3,
  TrendingUp,
  Map,
  Layers,
  Target,
  Timer,
  Compass,
  Wind,
  Droplets,
  Sun,
  CloudRain,
  CloudSnow,
} from 'lucide-react';

// Enhanced tracking interfaces
interface TrackingEvent {
  id: string;
  timestamp: Date;
  type: 'pickup' | 'in_transit' | 'checkpoint' | 'delivery' | 'exception' | 'delay' | 'reroute';
  location: {
    name: string;
    address: string;
    coordinates: [number, number];
    timezone: string;
  };
  status: string;
  description: string;
  driver?: {
    name: string;
    id: string;
    phone: string;
    photo?: string;
  };
  vehicle?: {
    id: string;
    type: string;
    plate: string;
    capacity: number;
  };
  temperature?: {
    current: number;
    min: number;
    max: number;
    unit: 'C' | 'F';
  };
  humidity?: number;
  photos?: string[];
  documents?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
  signatures?: {
    signee: string;
    timestamp: Date;
    imageUrl: string;
  }[];
  nextExpectedLocation?: string;
  estimatedArrival?: Date;
  actualArrival?: Date;
  delay?: {
    reason: string;
    duration: number; // minutes
    resolved: boolean;
  };
}

interface LiveLocation {
  coordinates: [number, number];
  timestamp: Date;
  speed: number; // km/h
  heading: number; // degrees
  accuracy: number; // meters
  altitude?: number;
  vehicleId: string;
  driverId: string;
}

interface EnvironmentalData {
  timestamp: Date;
  temperature: number;
  humidity: number;
  pressure?: number;
  shockLevel?: number;
  tiltAngle?: number;
  lightExposure?: number;
  vibrationLevel?: number;
  doorOpened?: boolean;
  tamperDetected?: boolean;
}

interface ShipmentDetails {
  id: string;
  trackingNumber: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  priority: 'standard' | 'express' | 'urgent' | 'critical';
  origin: TrackingEvent['location'];
  destination: TrackingEvent['location'];
  currentLocation?: LiveLocation;
  estimatedDelivery: Date;
  actualDelivery?: Date;
  serviceType: string;
  specialInstructions?: string;
  requiresSignature: boolean;
  dangerousGoods?: {
    classification: string;
    unNumber: string;
    properShippingName: string;
    packingGroup: string;
    hazardClass: string;
    emergencyContact: string;
  };
  environmentalRequirements?: {
    temperatureRange: [number, number];
    humidityRange: [number, number];
    fragile: boolean;
    upright: boolean;
    shockSensitive: boolean;
  };
  insurance?: {
    value: number;
    provider: string;
    policyNumber: string;
  };
  events: TrackingEvent[];
  liveTracking: LiveLocation[];
  environmentalData: EnvironmentalData[];
  customerNotes?: string;
  internalNotes?: string;
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedBy: string;
    uploadedAt: Date;
  }[];
}

interface AdvancedTrackingProps {
  trackingNumber: string;
  onClose?: () => void;
  embedded?: boolean;
}

export function AdvancedTracking({ 
  trackingNumber, 
  onClose, 
  embedded = false 
}: AdvancedTrackingProps) {
  const [shipmentData, setShipmentData] = useState<ShipmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('timeline');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showEnvironmental, setShowEnvironmental] = useState(false);

  const { isDark } = useTheme();
  const { preferences } = useAccessibility();

  // Load shipment data
  useEffect(() => {
    const loadShipmentData = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData: ShipmentDetails = {
          id: '1',
          trackingNumber: trackingNumber,
          status: 'in_transit',
          priority: 'express',
          origin: {
            name: 'SafeShipper Toronto Hub',
            address: '123 Industrial Ave, Toronto, ON M5V 3A8',
            coordinates: [-79.3832, 43.6532],
            timezone: 'America/Toronto',
          },
          destination: {
            name: 'Customer Warehouse',
            address: '456 Business Blvd, Vancouver, BC V6B 1A1',
            coordinates: [-123.1207, 49.2827],
            timezone: 'America/Vancouver',
          },
          currentLocation: {
            coordinates: [-106.6700, 52.1579], // Saskatoon
            timestamp: new Date(),
            speed: 85,
            heading: 280,
            accuracy: 5,
            altitude: 520,
            vehicleId: 'VH-001',
            driverId: 'DR-001',
          },
          estimatedDelivery: new Date(Date.now() + 6 * 60 * 60 * 1000),
          serviceType: 'Express Dangerous Goods',
          specialInstructions: 'Handle with extreme care. Temperature sensitive.',
          requiresSignature: true,
          dangerousGoods: {
            classification: 'Class 3',
            unNumber: 'UN1203',
            properShippingName: 'Gasoline',
            packingGroup: 'II',
            hazardClass: 'Flammable Liquid',
            emergencyContact: '+1-800-HAZMAT',
          },
          environmentalRequirements: {
            temperatureRange: [-10, 25],
            humidityRange: [20, 80],
            fragile: true,
            upright: true,
            shockSensitive: true,
          },
          insurance: {
            value: 50000,
            provider: 'SafeShipper Insurance',
            policyNumber: 'POL-2024-001',
          },
          events: [
            {
              id: '1',
              timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
              type: 'pickup',
              location: {
                name: 'SafeShipper Toronto Hub',
                address: '123 Industrial Ave, Toronto, ON M5V 3A8',
                coordinates: [-79.3832, 43.6532],
                timezone: 'America/Toronto',
              },
              status: 'Picked Up',
              description: 'Package picked up and processed at origin facility',
              driver: {
                name: 'John Smith',
                id: 'DR-001',
                phone: '+1-555-0123',
                photo: '/avatars/driver-1.jpg',
              },
              vehicle: {
                id: 'VH-001',
                type: 'Hazmat Truck',
                plate: 'ABC-1234',
                capacity: 15000,
              },
              temperature: {
                current: 15,
                min: 15,
                max: 15,
                unit: 'C',
              },
              photos: ['/tracking/pickup-1.jpg', '/tracking/pickup-2.jpg'],
              documents: [
                {
                  id: 'doc-1',
                  name: 'Dangerous Goods Declaration',
                  type: 'PDF',
                  url: '/documents/dg-declaration.pdf',
                },
              ],
              nextExpectedLocation: 'Thunder Bay Checkpoint',
              estimatedArrival: new Date(Date.now() - 4 * 60 * 60 * 1000),
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
              type: 'checkpoint',
              location: {
                name: 'Thunder Bay Checkpoint',
                address: 'Highway 17, Thunder Bay, ON',
                coordinates: [-89.2477, 48.3809],
                timezone: 'America/Toronto',
              },
              status: 'In Transit',
              description: 'Package scanned at Thunder Bay checkpoint',
              temperature: {
                current: 18,
                min: 15,
                max: 20,
                unit: 'C',
              },
              actualArrival: new Date(Date.now() - 4 * 60 * 60 * 1000),
              nextExpectedLocation: 'Winnipeg Hub',
              estimatedArrival: new Date(Date.now() - 1 * 60 * 60 * 1000),
            },
            {
              id: '3',
              timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
              type: 'checkpoint',
              location: {
                name: 'Winnipeg Hub',
                address: '789 Logistics Way, Winnipeg, MB',
                coordinates: [-97.1384, 49.8951],
                timezone: 'America/Winnipeg',
              },
              status: 'In Transit',
              description: 'Package processed at Winnipeg hub',
              temperature: {
                current: 17,
                min: 15,
                max: 22,
                unit: 'C',
              },
              actualArrival: new Date(Date.now() - 1 * 60 * 60 * 1000),
              nextExpectedLocation: 'Saskatoon Checkpoint',
              estimatedArrival: new Date(Date.now() + 30 * 60 * 1000),
            },
          ],
          liveTracking: [
            {
              coordinates: [-97.1384, 49.8951],
              timestamp: new Date(Date.now() - 60 * 60 * 1000),
              speed: 0,
              heading: 0,
              accuracy: 3,
              vehicleId: 'VH-001',
              driverId: 'DR-001',
            },
            {
              coordinates: [-99.9504, 50.4452],
              timestamp: new Date(Date.now() - 30 * 60 * 1000),
              speed: 90,
              heading: 275,
              accuracy: 4,
              vehicleId: 'VH-001',
              driverId: 'DR-001',
            },
            {
              coordinates: [-106.6700, 52.1579],
              timestamp: new Date(),
              speed: 85,
              heading: 280,
              accuracy: 5,
              vehicleId: 'VH-001',
              driverId: 'DR-001',
            },
          ],
          environmentalData: [
            {
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
              temperature: 18,
              humidity: 45,
              pressure: 1013,
              shockLevel: 2,
              tiltAngle: 0,
              lightExposure: 0,
              vibrationLevel: 3,
              doorOpened: false,
              tamperDetected: false,
            },
            {
              timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
              temperature: 17,
              humidity: 42,
              pressure: 1015,
              shockLevel: 1,
              tiltAngle: 0,
              lightExposure: 0,
              vibrationLevel: 2,
              doorOpened: false,
              tamperDetected: false,
            },
            {
              timestamp: new Date(),
              temperature: 16,
              humidity: 48,
              pressure: 1012,
              shockLevel: 1,
              tiltAngle: 0,
              lightExposure: 0,
              vibrationLevel: 2,
              doorOpened: false,
              tamperDetected: false,
            },
          ],
          customerNotes: 'Handle with extreme care. Temperature sensitive materials.',
          attachments: [
            {
              id: 'att-1',
              name: 'Shipping Manifest',
              type: 'PDF',
              url: '/attachments/manifest.pdf',
              uploadedBy: 'System',
              uploadedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
            },
            {
              id: 'att-2',
              name: 'Insurance Certificate',
              type: 'PDF',
              url: '/attachments/insurance.pdf',
              uploadedBy: 'System',
              uploadedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
            },
          ],
        };

        setShipmentData(mockData);
        setError(null);
      } catch (err) {
        setError('Failed to load shipment data');
        console.error('Error loading shipment:', err);
      } finally {
        setLoading(false);
      }
    };

    loadShipmentData();
  }, [trackingNumber]);

  // Auto-refresh data
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-success-100 text-success-800';
      case 'in_transit':
        return 'bg-info-100 text-info-800';
      case 'out_for_delivery':
        return 'bg-warning-100 text-warning-800';
      case 'exception':
        return 'bg-error-100 text-error-800';
      case 'pending':
        return 'bg-neutral-100 text-neutral-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return CheckCircle;
      case 'in_transit':
        return Truck;
      case 'out_for_delivery':
        return Package;
      case 'exception':
        return AlertTriangle;
      case 'pending':
        return Clock;
      default:
        return Package;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-error-100 text-error-800';
      case 'urgent':
        return 'bg-warning-100 text-warning-800';
      case 'express':
        return 'bg-info-100 text-info-800';
      case 'standard':
        return 'bg-neutral-100 text-neutral-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const calculateProgress = () => {
    if (!shipmentData) return 0;
    
    const totalEvents = shipmentData.events.length;
    const completedEvents = shipmentData.events.filter(e => e.actualArrival).length;
    
    return Math.round((completedEvents / totalEvents) * 100);
  };

  const getEnvironmentalStatus = () => {
    if (!shipmentData?.environmentalData.length) return 'unknown';
    
    const latest = shipmentData.environmentalData[shipmentData.environmentalData.length - 1];
    const requirements = shipmentData.environmentalRequirements;
    
    if (!requirements) return 'unknown';
    
    const tempInRange = latest.temperature >= requirements.temperatureRange[0] && 
                       latest.temperature <= requirements.temperatureRange[1];
    const humidityInRange = latest.humidity >= requirements.humidityRange[0] && 
                           latest.humidity <= requirements.humidityRange[1];
    
    if (tempInRange && humidityInRange && !latest.tamperDetected) return 'good';
    if (tempInRange && humidityInRange) return 'warning';
    return 'critical';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-neutral-200 rounded w-2/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-neutral-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Tracking Data</h3>
        <p className="text-neutral-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!shipmentData) {
    return (
      <div className="p-6 text-center">
        <Package className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Shipment Not Found</h3>
        <p className="text-neutral-600">No tracking information available for {trackingNumber}</p>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(shipmentData.status);
  const progress = calculateProgress();
  const environmentalStatus = getEnvironmentalStatus();

  return (
    <div className={cn(
      'space-y-6',
      embedded ? 'p-0' : 'p-6'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">
            Tracking: {shipmentData.trackingNumber}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {shipmentData.serviceType} • {shipmentData.origin.name} → {shipmentData.destination.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-success-50 text-success-700' : ''}
          >
            {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info-100 rounded-lg">
                <StatusIcon className="h-5 w-5 text-info-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Status</p>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(shipmentData.status)}>
                    {shipmentData.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(shipmentData.priority)}>
                    {shipmentData.priority}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-100 rounded-lg">
                <Clock className="h-5 w-5 text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">ETA</p>
                <p className="font-semibold">
                  {format(shipmentData.estimatedDelivery, 'MMM dd, HH:mm')}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatDistance(shipmentData.estimatedDelivery, new Date(), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 rounded-lg">
                <Route className="h-5 w-5 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Progress</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{progress}%</span>
                    <span className="text-xs text-neutral-500">
                      {shipmentData.events.filter(e => e.actualArrival).length} / {shipmentData.events.length} checkpoints
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                environmentalStatus === 'good' ? 'bg-success-100' :
                environmentalStatus === 'warning' ? 'bg-warning-100' :
                'bg-error-100'
              )}>
                <Thermometer className={cn(
                  'h-5 w-5',
                  environmentalStatus === 'good' ? 'text-success-600' :
                  environmentalStatus === 'warning' ? 'text-warning-600' :
                  'text-error-600'
                )} />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Environment</p>
                <div className="flex items-center gap-2">
                  <Badge className={
                    environmentalStatus === 'good' ? 'bg-success-100 text-success-800' :
                    environmentalStatus === 'warning' ? 'bg-warning-100 text-warning-800' :
                    'bg-error-100 text-error-800'
                  }>
                    {environmentalStatus}
                  </Badge>
                  {shipmentData.environmentalData.length > 0 && (
                    <span className="text-xs text-neutral-500">
                      {shipmentData.environmentalData[shipmentData.environmentalData.length - 1].temperature}°C
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="live">Live Tracking</TabsTrigger>
          <TabsTrigger value="environmental">Environmental</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipment Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {shipmentData.events.map((event, index) => (
                  <div key={event.id} className="flex items-start gap-4">
                    <div className="relative">
                      <div className={cn(
                        'w-10 h-10 rounded-full border-2 flex items-center justify-center',
                        event.actualArrival 
                          ? 'bg-success-100 border-success-500' 
                          : 'bg-neutral-100 border-neutral-300'
                      )}>
                        {event.type === 'pickup' && <Package className="h-5 w-5 text-success-600" />}
                        {event.type === 'checkpoint' && <MapPin className="h-5 w-5 text-info-600" />}
                        {event.type === 'in_transit' && <Truck className="h-5 w-5 text-info-600" />}
                        {event.type === 'delivery' && <CheckCircle className="h-5 w-5 text-success-600" />}
                        {event.type === 'exception' && <AlertTriangle className="h-5 w-5 text-error-600" />}
                      </div>
                      {index < shipmentData.events.length - 1 && (
                        <div className="absolute top-10 left-1/2 w-0.5 h-16 bg-neutral-200 transform -translate-x-1/2" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{event.status}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {event.type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-neutral-500">
                            {format(event.timestamp, 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-neutral-600 mb-2">{event.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-neutral-700">Location</p>
                          <p className="text-neutral-600">{event.location.name}</p>
                          <p className="text-neutral-500">{event.location.address}</p>
                        </div>
                        
                        {event.driver && (
                          <div>
                            <p className="font-medium text-neutral-700">Driver</p>
                            <p className="text-neutral-600">{event.driver.name}</p>
                            <p className="text-neutral-500">{event.driver.phone}</p>
                          </div>
                        )}
                      </div>
                      
                      {event.temperature && (
                        <div className="mt-3 p-2 bg-neutral-50 rounded">
                          <div className="flex items-center gap-2">
                            <Thermometer className="h-4 w-4 text-info-600" />
                            <span className="text-sm">
                              Temperature: {event.temperature.current}°{event.temperature.unit}
                              {event.temperature.min !== event.temperature.max && (
                                <span className="text-neutral-500 ml-1">
                                  ({event.temperature.min}-{event.temperature.max}°{event.temperature.unit})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {event.delay && (
                        <div className="mt-3 p-2 bg-warning-50 rounded">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-warning-600" />
                            <span className="text-sm">
                              Delayed: {event.delay.reason} ({event.delay.duration} minutes)
                            </span>
                            {event.delay.resolved && (
                              <Badge variant="outline" className="ml-2">Resolved</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {event.photos && event.photos.length > 0 && (
                        <div className="mt-3 flex gap-2">
                          {event.photos.map((photo, i) => (
                            <button
                              key={i}
                              className="w-16 h-16 bg-neutral-100 rounded border hover:bg-neutral-200 flex items-center justify-center"
                              onClick={() => {/* Open photo modal */}}
                            >
                              <Camera className="h-4 w-4 text-neutral-500" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Live Tracking
                <Badge variant="outline" className="ml-auto">
                  <div className="w-2 h-2 bg-success-500 rounded-full mr-1 animate-pulse" />
                  Live
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shipmentData.currentLocation && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-neutral-600">Current Speed</p>
                      <p className="text-2xl font-bold text-info-600">
                        {shipmentData.currentLocation.speed} km/h
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-neutral-600">Heading</p>
                      <p className="text-2xl font-bold text-info-600">
                        {shipmentData.currentLocation.heading}°
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-neutral-600">Accuracy</p>
                      <p className="text-2xl font-bold text-info-600">
                        ±{shipmentData.currentLocation.accuracy}m
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="h-64 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Map className="h-12 w-12 text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-600">Interactive map would appear here</p>
                    <p className="text-sm text-neutral-500">
                      Coordinates: {shipmentData.currentLocation?.coordinates.join(', ')}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Vehicle Information</h4>
                    {shipmentData.events[0]?.vehicle && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Vehicle ID:</span>
                          <span>{shipmentData.events[0].vehicle.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span>{shipmentData.events[0].vehicle.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Plate:</span>
                          <span>{shipmentData.events[0].vehicle.plate}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Driver Information</h4>
                    {shipmentData.events[0]?.driver && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Name:</span>
                          <span>{shipmentData.events[0].driver.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ID:</span>
                          <span>{shipmentData.events[0].driver.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contact:</span>
                          <span>{shipmentData.events[0].driver.phone}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environmental" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Environmental Monitoring
                <Badge className={
                  environmentalStatus === 'good' ? 'bg-success-100 text-success-800' :
                  environmentalStatus === 'warning' ? 'bg-warning-100 text-warning-800' :
                  'bg-error-100 text-error-800'
                }>
                  {environmentalStatus}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {shipmentData.environmentalData.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Current Conditions</h4>
                      <div className="space-y-2">
                        {shipmentData.environmentalData.slice(-1).map((data, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Temperature:</span>
                              <span className="font-medium">{data.temperature}°C</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Humidity:</span>
                              <span className="font-medium">{data.humidity}%</span>
                            </div>
                            {data.pressure && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Pressure:</span>
                                <span className="font-medium">{data.pressure} hPa</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Shock Level:</span>
                              <span className="font-medium">{data.shockLevel || 0}/10</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Requirements</h4>
                      {shipmentData.environmentalRequirements && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Temperature Range:</span>
                            <span>{shipmentData.environmentalRequirements.temperatureRange.join(' to ')}°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Humidity Range:</span>
                            <span>{shipmentData.environmentalRequirements.humidityRange.join(' to ')}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fragile:</span>
                            <span>{shipmentData.environmentalRequirements.fragile ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Keep Upright:</span>
                            <span>{shipmentData.environmentalRequirements.upright ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shock Sensitive:</span>
                            <span>{shipmentData.environmentalRequirements.shockSensitive ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="h-64 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-600">Environmental data chart would appear here</p>
                    <p className="text-sm text-neutral-500">
                      Showing temperature and humidity trends over time
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents & Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shipmentData.attachments && shipmentData.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Shipment Documents</h4>
                    <div className="space-y-2">
                      {shipmentData.attachments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-neutral-500" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-neutral-500">
                                {doc.type} • Uploaded by {doc.uploadedBy} • {format(doc.uploadedAt, 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {shipmentData.events.some(e => e.documents?.length) && (
                  <div>
                    <h4 className="font-medium mb-3">Event Documents</h4>
                    <div className="space-y-2">
                      {shipmentData.events.map((event) => 
                        event.documents?.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-neutral-500" />
                              <div>
                                <p className="font-medium">{doc.name}</p>
                                <p className="text-sm text-neutral-500">
                                  {doc.type} • {event.location.name} • {format(event.timestamp, 'MMM dd, yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Tracking Number:</span>
                  <span className="font-medium">{shipmentData.trackingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Service Type:</span>
                  <span className="font-medium">{shipmentData.serviceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Priority:</span>
                  <Badge className={getPriorityColor(shipmentData.priority)}>
                    {shipmentData.priority}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Signature Required:</span>
                  <span className="font-medium">{shipmentData.requiresSignature ? 'Yes' : 'No'}</span>
                </div>
                {shipmentData.specialInstructions && (
                  <div>
                    <span className="text-sm text-neutral-600">Special Instructions:</span>
                    <p className="text-sm mt-1 p-2 bg-neutral-50 rounded">
                      {shipmentData.specialInstructions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {shipmentData.dangerousGoods && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Dangerous Goods
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Classification:</span>
                    <span className="font-medium">{shipmentData.dangerousGoods.classification}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">UN Number:</span>
                    <span className="font-medium">{shipmentData.dangerousGoods.unNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Hazard Class:</span>
                    <span className="font-medium">{shipmentData.dangerousGoods.hazardClass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Packing Group:</span>
                    <span className="font-medium">{shipmentData.dangerousGoods.packingGroup}</span>
                  </div>
                  <div>
                    <span className="text-sm text-neutral-600">Proper Shipping Name:</span>
                    <p className="text-sm mt-1 font-medium">{shipmentData.dangerousGoods.properShippingName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-neutral-600">Emergency Contact:</span>
                    <p className="text-sm mt-1 font-medium">{shipmentData.dangerousGoods.emergencyContact}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {shipmentData.insurance && (
              <Card>
                <CardHeader>
                  <CardTitle>Insurance Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Coverage Value:</span>
                    <span className="font-medium">${shipmentData.insurance.value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Provider:</span>
                    <span className="font-medium">{shipmentData.insurance.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Policy Number:</span>
                    <span className="font-medium">{shipmentData.insurance.policyNumber}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Customer Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {shipmentData.customerNotes ? (
                  <p className="text-sm p-3 bg-neutral-50 rounded">
                    {shipmentData.customerNotes}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-500">No customer notes available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}