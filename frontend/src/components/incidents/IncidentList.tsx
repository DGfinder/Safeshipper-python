"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
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
import {
  AlertTriangle,
  Search,
  Filter,
  X,
  Download,
  Eye,
  Edit,
  MapPin,
  Clock,
  User,
  FileText,
  Shield,
  Zap,
  Calendar,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { incidentService } from '@/shared/services/incidentService';
import {
  IncidentListItem,
  IncidentListResponse,
  IncidentFilters,
  IncidentType,
} from '@/shared/types/incident';

interface IncidentListProps {
  onViewIncident?: (incident: IncidentListItem) => void;
  onEditIncident?: (incident: IncidentListItem) => void;
  onExportIncidents?: () => void;
  initialFilters?: Partial<IncidentFilters>;
  showFilters?: boolean;
  pageSize?: number;
}

interface FilterState {
  search: string;
  status: string;
  priority: string;
  incident_type: string;
  assigned_to: string;
  date_from: string;
  date_to: string;
  environmental_impact: string;
  has_injuries: string;
  authority_notified: string;
  emergency_services_called: string;
  hazard_class: string;
}

export function IncidentList({
  onViewIncident,
  onEditIncident,
  onExportIncidents,
  initialFilters = {},
  showFilters = true,
  pageSize = 20,
}: IncidentListProps) {
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    search: initialFilters.search || '',
    status: initialFilters.status?.toString() || 'all',
    priority: initialFilters.priority?.toString() || 'all',
    incident_type: initialFilters.incident_type || 'all',
    assigned_to: initialFilters.assigned_to || 'all',
    date_from: initialFilters.occurred_at__gte || '',
    date_to: initialFilters.occurred_at__lte || '',
    environmental_impact: initialFilters.environmental_impact?.toString() || 'all',
    has_injuries: 'all',
    authority_notified: initialFilters.authority_notified?.toString() || 'all',
    emergency_services_called: initialFilters.emergency_services_called?.toString() || 'all',
    hazard_class: initialFilters.hazard_class || 'all',
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchIncidents();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Fetch incidents when filters or page changes
  useEffect(() => {
    fetchIncidents();
  }, [currentPage, filters.status, filters.priority, filters.incident_type, 
      filters.date_from, filters.date_to, filters.environmental_impact, 
      filters.authority_notified, filters.emergency_services_called, filters.hazard_class]);

  // Fetch incident types
  useEffect(() => {
    fetchIncidentTypes();
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const apiFilters: IncidentFilters = {
        search: filters.search || undefined,
        status: filters.status !== 'all' ? [filters.status] : undefined,
        priority: filters.priority !== 'all' ? [filters.priority] : undefined,
        incident_type: filters.incident_type !== 'all' ? filters.incident_type : undefined,
        occurred_at__gte: filters.date_from || undefined,
        occurred_at__lte: filters.date_to || undefined,
        environmental_impact: filters.environmental_impact !== 'all' ? filters.environmental_impact === 'true' : undefined,
        authority_notified: filters.authority_notified !== 'all' ? filters.authority_notified === 'true' : undefined,
        emergency_services_called: filters.emergency_services_called !== 'all' ? filters.emergency_services_called === 'true' : undefined,
        hazard_class: filters.hazard_class !== 'all' ? filters.hazard_class : undefined,
        ordering: '-occurred_at',
      };

      // Add pagination
      const offset = (currentPage - 1) * pageSize;
      
      const response = await incidentService.getIncidents({
        ...apiFilters,
        limit: pageSize,
        offset,
      } as any);
      
      setIncidents(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  const fetchIncidentTypes = async () => {
    try {
      const types = await incidentService.getIncidentTypes();
      setIncidentTypes(types);
    } catch (error) {
      console.error('Error fetching incident types:', error);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      priority: 'all',
      incident_type: 'all',
      assigned_to: 'all',
      date_from: '',
      date_to: '',
      environmental_impact: 'all',
      has_injuries: 'all',
      authority_notified: 'all',
      emergency_services_called: 'all',
      hazard_class: 'all',
    });
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      const apiFilters: IncidentFilters = {
        search: filters.search || undefined,
        status: filters.status !== 'all' ? [filters.status] : undefined,
        priority: filters.priority !== 'all' ? [filters.priority] : undefined,
        incident_type: filters.incident_type !== 'all' ? filters.incident_type : undefined,
        occurred_at__gte: filters.date_from || undefined,
        occurred_at__lte: filters.date_to || undefined,
        environmental_impact: filters.environmental_impact !== 'all' ? filters.environmental_impact === 'true' : undefined,
        authority_notified: filters.authority_notified !== 'all' ? filters.authority_notified === 'true' : undefined,
        emergency_services_called: filters.emergency_services_called !== 'all' ? filters.emergency_services_called === 'true' : undefined,
        hazard_class: filters.hazard_class !== 'all' ? filters.hazard_class : undefined,
      };

      const blob = await incidentService.exportIncidents(apiFilters, 'csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incidents-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting incidents:', error);
    }
  };

  const getPriorityColor = (priority: string): string => {
    return incidentService.getPriorityColor(priority);
  };

  const getStatusColor = (status: string): string => {
    return incidentService.getStatusColor(status);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters
                <Badge variant="outline" className="ml-2">
                  {totalCount} incidents
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                >
                  {filtersExpanded ? 'Less Filters' : 'More Filters'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Primary Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <Label className="text-sm font-medium">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search incidents, numbers, locations..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Extended Filters */}
              {filtersExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                  {/* Incident Type Filter */}
                  <div>
                    <Label className="text-sm font-medium">Incident Type</Label>
                    <Select value={filters.incident_type} onValueChange={(value) => handleFilterChange('incident_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {incidentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Environmental Impact Filter */}
                  <div>
                    <Label className="text-sm font-medium">Environmental Impact</Label>
                    <Select value={filters.environmental_impact} onValueChange={(value) => handleFilterChange('environmental_impact', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Has Impact</SelectItem>
                        <SelectItem value="false">No Impact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Authority Notified Filter */}
                  <div>
                    <Label className="text-sm font-medium">Authority Notified</Label>
                    <Select value={filters.authority_notified} onValueChange={(value) => handleFilterChange('authority_notified', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Notified</SelectItem>
                        <SelectItem value="false">Not Notified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Emergency Services Filter */}
                  <div>
                    <Label className="text-sm font-medium">Emergency Services</Label>
                    <Select value={filters.emergency_services_called} onValueChange={(value) => handleFilterChange('emergency_services_called', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Called</SelectItem>
                        <SelectItem value="false">Not Called</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date From */}
                  <div>
                    <Label className="text-sm font-medium">Date From</Label>
                    <Input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <Label className="text-sm font-medium">Date To</Label>
                    <Input
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    />
                  </div>

                  {/* Hazard Class Filter */}
                  <div>
                    <Label className="text-sm font-medium">Hazard Class</Label>
                    <Select value={filters.hazard_class} onValueChange={(value) => handleFilterChange('hazard_class', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        <SelectItem value="1">Class 1 - Explosives</SelectItem>
                        <SelectItem value="2">Class 2 - Gases</SelectItem>
                        <SelectItem value="3">Class 3 - Flammable Liquids</SelectItem>
                        <SelectItem value="4">Class 4 - Flammable Solids</SelectItem>
                        <SelectItem value="5">Class 5 - Oxidizing Substances</SelectItem>
                        <SelectItem value="6">Class 6 - Toxic Substances</SelectItem>
                        <SelectItem value="7">Class 7 - Radioactive Material</SelectItem>
                        <SelectItem value="8">Class 8 - Corrosive Substances</SelectItem>
                        <SelectItem value="9">Class 9 - Miscellaneous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Incidents ({totalCount} total)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onExportIncidents || handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3">Loading incidents...</span>
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No incidents match your current filters.</p>
              <Button variant="outline" onClick={clearFilters} className="mt-2">
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-blue-600">
                          {incident.incident_number}
                        </span>
                        <Badge className={`${getPriorityColor(incident.priority)} text-white`}>
                          {incident.priority.toUpperCase()}
                        </Badge>
                        <Badge className={`${getStatusColor(incident.status)} text-white`}>
                          {incident.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {incident.incident_type.category}
                        </Badge>
                        {incident.is_overdue && (
                          <Badge className="bg-red-500 text-white">
                            <Clock className="h-3 w-3 mr-1" />
                            OVERDUE
                          </Badge>
                        )}
                        {incident.requires_regulatory_notification && (
                          <Badge className="bg-orange-500 text-white">
                            <Shield className="h-3 w-3 mr-1" />
                            REGULATORY
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-medium text-lg mb-2">{incident.title}</h3>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500 mb-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {incident.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(incident.occurred_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {incident.reporter.first_name} {incident.reporter.last_name}
                        </div>
                        {incident.assigned_to && (
                          <div className="flex items-center gap-1">
                            <UserCheck className="h-4 w-4" />
                            Assigned to {incident.assigned_to.first_name} {incident.assigned_to.last_name}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{incident.updates_count} updates</span>
                        <span>{incident.documents_count} documents</span>
                        <span>{incident.dangerous_goods_count} dangerous goods</span>
                        {incident.injuries_count > 0 && (
                          <span className="text-red-600 font-medium">
                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                            {incident.injuries_count} injuries
                          </span>
                        )}
                        {incident.environmental_impact && (
                          <span className="text-orange-600 font-medium">
                            <Zap className="h-3 w-3 inline mr-1" />
                            Environmental impact
                          </span>
                        )}
                        {incident.authority_notified && (
                          <span className="text-blue-600 font-medium">
                            <Shield className="h-3 w-3 inline mr-1" />
                            Authority notified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onViewIncident?.(incident)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {incident.status !== "closed" && onEditIncident && (
                        <Button variant="outline" size="sm" onClick={() => onEditIncident(incident)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} incidents
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}