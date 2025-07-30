"use client";

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, MarkerClusterGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/dist/styles.min.css';
import { divIcon } from 'leaflet';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import {
  AlertTriangle,
  MapPin,
  Filter,
  Calendar,
  User,
  Eye,
  RotateCcw,
  Layers,
  Search,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { usePermissions } from '@/contexts/PermissionContext';
import { incidentService } from '@/shared/services/incidentService';
import {
  IncidentListItem,
  IncidentFilters,
  IncidentType,
} from '@/shared/types/incident';

interface IncidentMapViewProps {
  onIncidentSelect?: (incident: IncidentListItem) => void;
  initialFilters?: IncidentFilters;
  height?: string;
}

interface MapFilters {
  status: string[];
  priority: string[];
  incident_type: string;
  date_range: string;
  environmental_impact: boolean | null;
  has_injuries: boolean | null;
  search: string;
}

const DEFAULT_CENTER: [number, number] = [-33.8688, 151.2093]; // Sydney, Australia
const DEFAULT_ZOOM = 10;

export default function IncidentMapView({
  onIncidentSelect,
  initialFilters,
  height = '600px',
}: IncidentMapViewProps) {
  const { can } = usePermissions();
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IncidentListItem | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  
  const [filters, setFilters] = useState<MapFilters>({
    status: [],
    priority: [],
    incident_type: '',
    date_range: '',
    environmental_impact: null,
    has_injuries: null,
    search: '',
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [incidentsData, typesData] = await Promise.all([
          incidentService.getIncidents({
            ...initialFilters,
            ...convertFiltersToAPI(filters),
          }),
          incidentService.getIncidentTypes(),
        ]);
        
        // Filter incidents that have coordinates
        const incidentsWithCoords = incidentsData.results.filter(
          (incident) => incident.coordinates
        );
        
        setIncidents(incidentsWithCoords);
        setIncidentTypes(typesData);
        
        // Auto-center map if incidents exist
        if (incidentsWithCoords.length > 0) {
          const avgLat = incidentsWithCoords.reduce((sum, inc) => sum + inc.coordinates!.lat, 0) / incidentsWithCoords.length;
          const avgLng = incidentsWithCoords.reduce((sum, inc) => sum + inc.coordinates!.lng, 0) / incidentsWithCoords.length;
          setMapCenter([avgLat, avgLng]);
        }
      } catch (error) {
        console.error('Error loading map data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [initialFilters, filters]);

  // Convert internal filters to API format
  const convertFiltersToAPI = (mapFilters: MapFilters): IncidentFilters => {
    const apiFilters: IncidentFilters = {};
    
    if (mapFilters.status.length > 0) {
      apiFilters.status = mapFilters.status;
    }
    
    if (mapFilters.priority.length > 0) {
      apiFilters.priority = mapFilters.priority;
    }
    
    if (mapFilters.incident_type) {
      apiFilters.incident_type = mapFilters.incident_type;
    }
    
    if (mapFilters.environmental_impact !== null) {
      apiFilters.environmental_impact = mapFilters.environmental_impact;
    }
    
    if (mapFilters.has_injuries !== null) {
      apiFilters.injuries_count__gte = mapFilters.has_injuries ? 1 : undefined;
    }
    
    if (mapFilters.search) {
      apiFilters.search = mapFilters.search;
    }
    
    // Date range handling
    if (mapFilters.date_range) {
      const now = new Date();
      let startDate: Date;
      
      switch (mapFilters.date_range) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }
      
      apiFilters.occurred_at__gte = startDate.toISOString();
    }
    
    return apiFilters;
  };

  // Create custom marker icons based on priority and status
  const createMarkerIcon = (incident: IncidentListItem) => {
    const priorityColors = {
      critical: '#ef4444', // red
      high: '#f97316',     // orange
      medium: '#eab308',   // yellow
      low: '#22c55e',      // green
    };
    
    const statusShapes = {
      reported: 'circle',
      investigating: 'triangle',
      resolved: 'square',
      closed: 'diamond',
    };
    
    const color = priorityColors[incident.priority] || '#6b7280';
    const size = incident.priority === 'critical' ? 16 : incident.priority === 'high' ? 14 : 12;
    
    return divIcon({
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: ${statusShapes[incident.status] === 'circle' ? '50%' : statusShapes[incident.status] === 'square' ? '0%' : '0%'};
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${incident.environmental_impact ? '<span style="color: white; font-size: 8px;">!</span>' : ''}
        </div>
      `,
      className: 'custom-incident-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Filter incidents based on current filters
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(incident.status)) {
        return false;
      }
      
      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(incident.priority)) {
        return false;
      }
      
      // Incident type filter
      if (filters.incident_type && incident.incident_type.id !== filters.incident_type) {
        return false;
      }
      
      // Environmental impact filter
      if (filters.environmental_impact !== null && incident.environmental_impact !== filters.environmental_impact) {
        return false;
      }
      
      // Injuries filter
      if (filters.has_injuries !== null) {
        const hasInjuries = incident.injuries_count > 0;
        if (hasInjuries !== filters.has_injuries) {
          return false;
        }
      }
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          incident.title.toLowerCase().includes(searchLower) ||
          incident.incident_number.toLowerCase().includes(searchLower) ||
          incident.location.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) {
          return false;
        }
      }
      
      return true;
    });
  }, [incidents, filters]);

  const handleFilterChange = (key: keyof MapFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      incident_type: '',
      date_range: '',
      environmental_impact: null,
      has_injuries: null,
      search: '',
    });
  };

  const handleIncidentClick = (incident: IncidentListItem) => {
    setSelectedIncident(incident);
    onIncidentSelect?.(incident);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return 'bg-blue-500';
      case 'investigating': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (!can('incidents.view')) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            You do not have permission to view incidents.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Incident Map View</span>
              </CardTitle>
              <CardDescription>
                Showing {filteredIncidents.length} of {incidents.length} incidents with location data
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search incidents..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              {/* Filter Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {(filters.status.length + filters.priority.length + 
                      (filters.incident_type ? 1 : 0) + 
                      (filters.environmental_impact !== null ? 1 : 0) + 
                      (filters.has_injuries !== null ? 1 : 0)) > 0 && (
                      <Badge className="ml-2" variant="secondary">
                        {filters.status.length + filters.priority.length + 
                         (filters.incident_type ? 1 : 0) + 
                         (filters.environmental_impact !== null ? 1 : 0) + 
                         (filters.has_injuries !== null ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Map Filters</SheetTitle>
                    <SheetDescription>
                      Filter incidents shown on the map
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="space-y-6 mt-6">
                    {/* Status Filter */}
                    <div>
                      <Label className="text-base font-medium">Status</Label>
                      <div className="space-y-2 mt-2">
                        {['reported', 'investigating', 'resolved', 'closed'].map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={`status-${status}`}
                              checked={filters.status.includes(status)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleFilterChange('status', [...filters.status, status]);
                                } else {
                                  handleFilterChange('status', filters.status.filter(s => s !== status));
                                }
                              }}
                            />
                            <Label htmlFor={`status-${status}`} className="capitalize">
                              {status}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Priority Filter */}
                    <div>
                      <Label className="text-base font-medium">Priority</Label>
                      <div className="space-y-2 mt-2">
                        {['critical', 'high', 'medium', 'low'].map((priority) => (
                          <div key={priority} className="flex items-center space-x-2">
                            <Checkbox
                              id={`priority-${priority}`}
                              checked={filters.priority.includes(priority)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleFilterChange('priority', [...filters.priority, priority]);
                                } else {
                                  handleFilterChange('priority', filters.priority.filter(p => p !== priority));
                                }
                              }}
                            />
                            <Label htmlFor={`priority-${priority}`} className="capitalize flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(priority)}`} />
                              <span>{priority}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Incident Type Filter */}
                    <div>
                      <Label className="text-base font-medium">Incident Type</Label>
                      <Select
                        value={filters.incident_type}
                        onValueChange={(value) => handleFilterChange('incident_type', value)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Types</SelectItem>
                          {incidentTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Date Range Filter */}
                    <div>
                      <Label className="text-base font-medium">Date Range</Label>
                      <Select
                        value={filters.date_range}
                        onValueChange={(value) => handleFilterChange('date_range', value)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Time</SelectItem>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                          <SelectItem value="365d">Last Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Environmental Impact Filter */}
                    <div>
                      <Label className="text-base font-medium">Environmental Impact</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="env-impact-yes"
                            checked={filters.environmental_impact === true}
                            onCheckedChange={(checked) => {
                              handleFilterChange('environmental_impact', checked ? true : null);
                            }}
                          />
                          <Label htmlFor="env-impact-yes">Has Environmental Impact</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="env-impact-no"
                            checked={filters.environmental_impact === false}
                            onCheckedChange={(checked) => {
                              handleFilterChange('environmental_impact', checked ? false : null);
                            }}
                          />
                          <Label htmlFor="env-impact-no">No Environmental Impact</Label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Injuries Filter */}
                    <div>
                      <Label className="text-base font-medium">Injuries</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="injuries-yes"
                            checked={filters.has_injuries === true}
                            onCheckedChange={(checked) => {
                              handleFilterChange('has_injuries', checked ? true : null);
                            }}
                          />
                          <Label htmlFor="injuries-yes">Has Injuries</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="injuries-no"
                            checked={filters.has_injuries === false}
                            onCheckedChange={(checked) => {
                              handleFilterChange('has_injuries', checked ? false : null);
                            }}
                          />
                          <Label htmlFor="injuries-no">No Injuries</Label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Clear Filters */}
                    <Button onClick={clearFilters} variant="outline" className="w-full">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">Priority</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-xs">Critical</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    <span className="text-xs">High</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-xs">Medium</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-xs">Low</span>
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block">Status</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-xs">Reported</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-yellow-500" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                    <span className="text-xs">Investigating</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-green-500"></div>
                    <span className="text-xs">Resolved</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-gray-500 transform rotate-45"></div>
                    <span className="text-xs">Closed</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <span className="font-medium">!</span> = Environmental Impact
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center" style={{ height }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3">Loading incidents...</span>
            </div>
          ) : (
            <div style={{ height, width: '100%' }}>
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                className="rounded-lg"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MarkerClusterGroup>
                  {filteredIncidents.map((incident) => (
                    <Marker
                      key={incident.id}
                      position={[incident.coordinates!.lat, incident.coordinates!.lng]}
                      icon={createMarkerIcon(incident)}
                    >
                      <Popup>
                        <div className="p-2 min-w-[300px]">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-sm">{incident.title}</h3>
                            <div className="flex items-center space-x-1">
                              <Badge className={`${getPriorityColor(incident.priority)} text-white text-xs`}>
                                {incident.priority.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-600 mb-3">
                            <div className="flex items-center justify-between">
                              <span>Number:</span>
                              <span className="font-mono">{incident.incident_number}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Status:</span>
                              <Badge className={`${getStatusColor(incident.status)} text-white text-xs`}>
                                {incident.status.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Occurred:</span>
                              <span>{format(new Date(incident.occurred_at), 'PP')}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Location:</span>
                              <span className="text-right">{incident.location}</span>
                            </div>
                            {incident.injuries_count > 0 && (
                              <div className="flex items-center justify-between text-red-600">
                                <span>Injuries:</span>
                                <span>{incident.injuries_count}</span>
                              </div>
                            )}
                            {incident.environmental_impact && (
                              <div className="flex items-center justify-between text-orange-600">
                                <span>Environmental Impact:</span>
                                <span>Yes</span>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => handleIncidentClick(incident)}
                            className="w-full"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}