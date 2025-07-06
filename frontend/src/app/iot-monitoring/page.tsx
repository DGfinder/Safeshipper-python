'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity,
  Thermometer,
  Droplets,
  MapPin,
  Battery,
  Wifi,
  AlertTriangle,
  Settings,
  Zap,
  Gauge,
  Radio,
  Clock,
  TrendingUp,
  Eye,
  Command
} from 'lucide-react';

interface IoTDevice {
  id: string;
  device_id: string;
  name: string;
  device_type: {
    name: string;
    category: string;
  };
  status: 'active' | 'inactive' | 'maintenance' | 'error' | 'offline';
  location: string;
  coordinates?: { lat: number; lng: number };
  last_seen: string;
  battery_level?: number;
  signal_strength?: number;
  is_online: boolean;
}

interface SensorReading {
  id: string;
  sensor_type: string;
  value: number;
  unit: string;
  timestamp: string;
  quality_score: number;
  device_name: string;
}

interface DeviceAlert {
  id: string;
  device_name: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  status: 'active' | 'acknowledged' | 'resolved';
  triggered_at: string;
}

interface IoTStats {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  devices_with_alerts: number;
  total_readings_today: number;
  active_alerts: number;
}

export default function IoTMonitoringPage() {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [stats, setStats] = useState<IoTStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Mock API calls - replace with actual API endpoints
      const mockStats: IoTStats = {
        total_devices: 12,
        online_devices: 10,
        offline_devices: 2,
        devices_with_alerts: 3,
        total_readings_today: 2847,
        active_alerts: 5
      };

      const mockDevices: IoTDevice[] = [
        {
          id: '1',
          device_id: 'ESP32_TEMP_001',
          name: 'Warehouse A Temperature Sensor',
          device_type: { name: 'Temperature Sensor', category: 'sensor' },
          status: 'active',
          location: 'Warehouse A - Bay 1',
          coordinates: { lat: 40.7128, lng: -74.0060 },
          last_seen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          battery_level: 85,
          signal_strength: -45,
          is_online: true
        },
        {
          id: '2',
          device_id: 'RPI_GATEWAY_001',
          name: 'Main Gateway',
          device_type: { name: 'IoT Gateway', category: 'controller' },
          status: 'active',
          location: 'Control Room',
          last_seen: new Date(Date.now() - 30 * 1000).toISOString(),
          signal_strength: -35,
          is_online: true
        },
        {
          id: '3',
          device_id: 'ESP32_SHOCK_002',
          name: 'Transport Monitor',
          device_type: { name: 'Shock Sensor', category: 'tracker' },
          status: 'error',
          location: 'Vehicle VH-001',
          last_seen: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          battery_level: 15,
          signal_strength: -75,
          is_online: false
        }
      ];

      const mockAlerts: DeviceAlert[] = [
        {
          id: '1',
          device_name: 'Transport Monitor',
          alert_type: 'battery_low',
          severity: 'warning',
          title: 'Low Battery Alert',
          description: 'Device battery level is below 20%',
          status: 'active',
          triggered_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          device_name: 'Warehouse A Temperature Sensor',
          alert_type: 'temperature_high',
          severity: 'critical',
          title: 'Temperature Threshold Exceeded',
          description: 'Temperature reading of 35°C exceeds critical threshold of 30°C',
          status: 'active',
          triggered_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
        }
      ];

      const mockSensorData: SensorReading[] = [
        {
          id: '1',
          sensor_type: 'temperature',
          value: 35.2,
          unit: '°C',
          timestamp: new Date().toISOString(),
          quality_score: 0.95,
          device_name: 'Warehouse A Temperature Sensor'
        },
        {
          id: '2',
          sensor_type: 'humidity',
          value: 68.5,
          unit: '%',
          timestamp: new Date().toISOString(),
          quality_score: 0.98,
          device_name: 'Warehouse A Temperature Sensor'
        },
        {
          id: '3',
          sensor_type: 'shock',
          value: 1,
          unit: 'event',
          timestamp: new Date(Date.now() - 30 * 1000).toISOString(),
          quality_score: 1.0,
          device_name: 'Transport Monitor'
        }
      ];

      setStats(mockStats);
      setDevices(mockDevices);
      setAlerts(mockAlerts);
      setSensorData(mockSensorData);
      
      if (!selectedDevice && mockDevices.length > 0) {
        setSelectedDevice(mockDevices[0]);
      }

    } catch (error) {
      console.error('Error fetching IoT data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSensorIcon = (sensorType: string) => {
    switch (sensorType) {
      case 'temperature': return Thermometer;
      case 'humidity': return Droplets;
      case 'pressure': return Gauge;
      case 'location': return MapPin;
      case 'shock': return Zap;
      default: return Activity;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IoT Monitoring</h1>
          <p className="text-gray-600">Real-time monitoring of IoT devices and sensors</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Radio className="h-4 w-4 mr-2" />
            Auto Refresh
          </Button>
          <Button onClick={fetchData}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Devices</p>
                  <p className="text-2xl font-bold">{stats.total_devices}</p>
                </div>
                <Settings className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Online</p>
                  <p className="text-2xl font-bold text-green-600">{stats.online_devices}</p>
                </div>
                <Wifi className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Offline</p>
                  <p className="text-2xl font-bold text-red-600">{stats.offline_devices}</p>
                </div>
                <Wifi className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.active_alerts}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Readings Today</p>
                  <p className="text-2xl font-bold">{stats.total_readings_today.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Data Quality</p>
                  <p className="text-2xl font-bold text-green-600">98%</p>
                </div>
                <Eye className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="sensors">Sensor Data</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Device Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {devices.slice(0, 5).map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)}`}></div>
                        <div>
                          <div className="font-medium">{device.name}</div>
                          <div className="text-sm text-gray-600">{device.device_id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {device.battery_level && (
                          <div className="flex items-center gap-1 text-sm">
                            <Battery className="h-4 w-4" />
                            {device.battery_level}%
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {new Date(device.last_seen).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${getSeverityColor(alert.severity)} text-white text-xs`}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-600">{alert.device_name}</span>
                          </div>
                          <div className="font-medium">{alert.title}</div>
                          <div className="text-sm text-gray-600">{alert.description}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(alert.triggered_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Device Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)}`}></div>
                          <h3 className="font-medium text-lg">{device.name}</h3>
                          <Badge variant="outline">{device.device_type.name}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Settings className="h-4 w-4" />
                            {device.device_id}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {device.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(device.last_seen).toLocaleString()}
                          </div>
                          {device.battery_level && (
                            <div className="flex items-center gap-1">
                              <Battery className="h-4 w-4" />
                              {device.battery_level}%
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Command className="h-4 w-4 mr-1" />
                          Command
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensors">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Sensor Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sensorData.map((reading) => {
                  const IconComponent = getSensorIcon(reading.sensor_type);
                  return (
                    <div key={reading.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                          <div>
                            <div className="font-medium capitalize">
                              {reading.sensor_type.replace('_', ' ')}
                            </div>
                            <div className="text-sm text-gray-600">{reading.device_name}</div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {reading.value} {reading.unit}
                          </div>
                          <div className="text-sm text-gray-600">
                            Quality: {(reading.quality_score * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(reading.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Device Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`${getSeverityColor(alert.severity)} text-white`}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{alert.title}</span>
                        </div>
                        
                        <p className="text-gray-600 mb-2">{alert.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Device: {alert.device_name}</span>
                          <span>Type: {alert.alert_type}</span>
                          <span>Triggered: {new Date(alert.triggered_at).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {alert.status === 'active' && (
                          <>
                            <Button variant="outline" size="sm">
                              Acknowledge
                            </Button>
                            <Button size="sm">
                              Resolve
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}