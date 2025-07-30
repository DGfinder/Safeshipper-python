"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  AlertTriangle,
  MapPin,
  Calendar,
  User,
  Clock,
  FileText,
  Image,
  Edit,
  MessageSquare,
  Shield,
  Truck,
  Package,
  Users,
  AlertCircle,
  CheckCircle2,
  Eye,
  Download,
  ExternalLink,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { incidentService } from '@/shared/services/incidentService';
import {
  Incident,
  IncidentDocument,
  IncidentUpdate,
  CorrectiveAction,
} from '@/shared/types/incident';

interface IncidentDetailProps {
  incidentId: string;
  onEdit?: () => void;
  onClose?: () => void;
}

export default function IncidentDetail({
  incidentId,
  onEdit,
  onClose,
}: IncidentDetailProps) {
  const { can } = usePermissions();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const canEdit = can('incidents.edit');
  const canViewDocuments = can('incidents.view.documents');
  const canViewTimeline = can('incidents.view.timeline');
  const canManageActions = can('incidents.manage.actions');

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        setLoading(true);
        const data = await incidentService.getIncident(incidentId);
        setIncident(data);
      } catch (error) {
        console.error('Error fetching incident:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIncident();
  }, [incidentId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!incident || !can('incidents.status.change')) return;

    try {
      const updatedIncident = await incidentService.updateStatus(incident.id, newStatus);
      setIncident(updatedIncident);
    } catch (error) {
      console.error('Error updating status:', error);
    }
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

  const getSeverityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading incident details...</span>
      </div>
    );
  }

  if (!incident) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Incident not found or access denied.</p>
          <Button onClick={onClose} className="mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                {getSeverityIcon(incident.priority)}
                <h1 className="text-2xl font-bold">{incident.title}</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="font-mono">
                  {incident.incident_number}
                </Badge>
                <Badge className={`${getPriorityColor(incident.priority)} text-white`}>
                  {incident.priority.toUpperCase()}
                </Badge>
                <Badge className={`${getStatusColor(incident.status)} text-white`}>
                  {incident.status.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {incident.incident_type.category}
                </Badge>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Occurred: {format(new Date(incident.occurred_at), 'PPp')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{incident.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>Reported by: {incident.reporter.first_name} {incident.reporter.last_name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {canEdit && incident.status !== 'closed' && (
                <Button onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              
              {can('incidents.status.change') && (
                <StatusActionButtons
                  incident={incident}
                  onStatusChange={handleStatusChange}
                />
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{incident.injuries_count}</div>
            <div className="text-sm text-gray-600">Injuries</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {incident.environmental_impact ? 'YES' : 'NO'}
            </div>
            <div className="text-sm text-gray-600">Environmental Impact</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{incident.documents?.length || 0}</div>
            <div className="text-sm text-gray-600">Documents</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{incident.duration_open?.days || 0}d</div>
            <div className="text-sm text-gray-600">Days Open</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          
          {canViewTimeline && (
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          )}
          
          {canViewDocuments && (
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          )}
          
          <TabsTrigger value="investigation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Investigation
          </TabsTrigger>
          
          {canManageActions && (
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Actions
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Incident Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{incident.description}</p>
                
                {incident.root_cause && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-800 mb-2">Root Cause</h4>
                    <p className="text-orange-700">{incident.root_cause}</p>
                  </div>
                )}

                {incident.contributing_factors && incident.contributing_factors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Contributing Factors</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {incident.contributing_factors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Key Details */}
            <div className="space-y-4">
              {/* Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assignment & Personnel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Assigned To:</span>
                    <div className="flex items-center space-x-2">
                      {incident.assigned_to ? (
                        <>
                          <User className="h-4 w-4" />
                          <span>{incident.assigned_to.first_name} {incident.assigned_to.last_name}</span>
                          <Badge variant="outline">{incident.assigned_to.role}</Badge>
                        </>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </div>
                  </div>

                  {incident.investigators && incident.investigators.length > 0 && (
                    <div>
                      <span className="text-gray-600 block mb-2">Investigators:</span>
                      <div className="space-y-2">
                        {incident.investigators.map((investigator) => (
                          <div key={investigator.id} className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{investigator.first_name} {investigator.last_name}</span>
                            <Badge variant="outline">{investigator.role}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {incident.witnesses && incident.witnesses.length > 0 && (
                    <div>
                      <span className="text-gray-600 block mb-2">Witnesses:</span>
                      <div className="space-y-2">
                        {incident.witnesses.map((witness) => (
                          <div key={witness.id} className="flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <span>{witness.first_name} {witness.last_name}</span>
                            <Badge variant="outline">{witness.role}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Associated Assets */}
              {(incident.shipment_info || incident.vehicle_info) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Associated Assets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {incident.shipment_info && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Shipment:</span>
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4" />
                          <span className="font-mono">{incident.shipment_info.tracking_number}</span>
                          <Badge variant="outline">{incident.shipment_info.status}</Badge>
                        </div>
                      </div>
                    )}

                    {incident.vehicle_info && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Vehicle:</span>
                        <div className="flex items-center space-x-2">
                          <Truck className="h-4 w-4" />
                          <span className="font-mono">{incident.vehicle_info.registration_number}</span>
                          <Badge variant="outline">{incident.vehicle_info.vehicle_type}</Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Dangerous Goods */}
          {incident.dangerous_goods_details && incident.dangerous_goods_details.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span>Dangerous Goods Involved</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incident.dangerous_goods_details.map((dg, index) => (
                    <div key={dg.id} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className="bg-orange-500 text-white">
                          {dg.dangerous_good.un_number}
                        </Badge>
                        <Badge variant="outline">
                          Class {dg.dangerous_good.hazard_class}
                        </Badge>
                      </div>
                      
                      <h4 className="font-medium mb-2">
                        {dg.dangerous_good.proper_shipping_name}
                      </h4>
                      
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quantity Involved:</span>
                          <span>{dg.quantity_involved} {dg.quantity_unit}</span>
                        </div>
                        
                        {dg.release_amount && dg.release_amount > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Released:</span>
                            <span>{dg.release_amount} {dg.quantity_unit}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Containment:</span>
                          <Badge variant={dg.containment_status === 'contained' ? 'default' : 'destructive'}>
                            {dg.containment_status}
                          </Badge>
                        </div>
                        
                        {dg.packaging_type && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Packaging:</span>
                            <span>{dg.packaging_type}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        {canViewTimeline && (
          <TabsContent value="timeline">
            <IncidentTimeline incident={incident} />
          </TabsContent>
        )}

        {/* Documents Tab */}
        {canViewDocuments && (
          <TabsContent value="documents">
            <IncidentDocuments 
              documents={incident.documents || []} 
              incidentId={incident.id}
            />
          </TabsContent>
        )}

        {/* Investigation Tab */}
        <TabsContent value="investigation">
          <IncidentInvestigation incident={incident} />
        </TabsContent>

        {/* Actions Tab */}
        {canManageActions && (
          <TabsContent value="actions">
            <CorrectiveActions 
              actions={incident.corrective_actions || []} 
              incidentId={incident.id}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Status Action Buttons Component
function StatusActionButtons({ 
  incident, 
  onStatusChange 
}: { 
  incident: Incident; 
  onStatusChange: (status: string) => void; 
}) {
  const getNextStatusActions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'reported':
        return [
          { status: 'investigating', label: 'Start Investigation', color: 'bg-yellow-500' }
        ];
      case 'investigating':
        return [
          { status: 'resolved', label: 'Mark Resolved', color: 'bg-green-500' }
        ];
      case 'resolved':
        return [
          { status: 'closed', label: 'Close Incident', color: 'bg-gray-500' },
          { status: 'investigating', label: 'Reopen Investigation', color: 'bg-yellow-500' }
        ];
      default:
        return [];
    }
  };

  const actions = getNextStatusActions(incident.status);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      {actions.map((action) => (
        <Button
          key={action.status}
          onClick={() => onStatusChange(action.status)}
          className={`${action.color} hover:opacity-90`}
          size="sm"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

// Timeline Component
function IncidentTimeline({ incident }: { incident: Incident }) {
  const timelineEvents = [
    {
      timestamp: incident.reported_at,
      type: 'reported',
      title: 'Incident Reported',
      description: `Reported by ${incident.reporter.first_name} ${incident.reporter.last_name}`,
      icon: FileText,
      color: 'bg-blue-500',
    },
    ...(incident.updates || []).map((update) => ({
      timestamp: update.created_at,
      type: update.update_type,
      title: update.update_type.replace('_', ' ').toUpperCase(),
      description: update.description,
      icon: MessageSquare,
      color: 'bg-gray-500',
    })),
    ...(incident.resolved_at ? [{
      timestamp: incident.resolved_at,
      type: 'resolved',
      title: 'Incident Resolved',
      description: incident.resolution_notes || 'Marked as resolved',
      icon: CheckCircle2,
      color: 'bg-green-500',
    }] : []),
    ...(incident.closed_at ? [{
      timestamp: incident.closed_at,
      type: 'closed',
      title: 'Incident Closed',
      description: 'Incident closed and archived',
      icon: CheckCircle2,
      color: 'bg-gray-500',
    }] : []),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incident Timeline</CardTitle>
        <CardDescription>
          Chronological history of all incident activities and updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {timelineEvents.map((event, index) => {
            const Icon = event.icon;
            return (
              <div key={index} className="flex items-start space-x-4">
                <div className={`rounded-full p-2 ${event.color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{event.title}</h4>
                    <span className="text-sm text-gray-500">
                      {format(new Date(event.timestamp), 'PPp')}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{event.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Documents Component
function IncidentDocuments({ 
  documents, 
  incidentId 
}: { 
  documents: IncidentDocument[]; 
  incidentId: string; 
}) {
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'photo': return Image;
      case 'report': return FileText;
      default: return FileText;
    }
  };

  const handleDownload = async (document: IncidentDocument) => {
    try {
      await incidentService.downloadDocument(incidentId, document.id);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supporting Documents</CardTitle>
        <CardDescription>
          Photos, reports, and other files related to this incident
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              const Icon = getDocumentIcon(doc.document_type);
              return (
                <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3 mb-2">
                    <Icon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{doc.title}</h4>
                      <p className="text-sm text-gray-500">
                        {format(new Date(doc.uploaded_at), 'PP')}
                      </p>
                    </div>
                  </div>
                  
                  {doc.description && (
                    <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{doc.document_type}</Badge>
                    <div className="flex items-center space-x-2">
                      {doc.file_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Investigation Component
function IncidentInvestigation({ incident }: { incident: Incident }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Investigation Details</CardTitle>
          <CardDescription>
            Root cause analysis and investigation findings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {incident.root_cause ? (
            <div>
              <h4 className="font-medium mb-2">Root Cause Analysis</h4>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-orange-800">{incident.root_cause}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Investigation pending or not yet started</p>
            </div>
          )}

          {incident.contributing_factors && incident.contributing_factors.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Contributing Factors</h4>
              <ul className="space-y-2">
                {incident.contributing_factors.map((factor, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {incident.weather_conditions && Object.keys(incident.weather_conditions).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Environmental Conditions</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(incident.weather_conditions).map(([key, value]) => (
                  <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 capitalize">{key}</p>
                    <p className="font-medium">{value as string}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Corrective Actions Component
function CorrectiveActions({ 
  actions, 
  incidentId 
}: { 
  actions: CorrectiveAction[]; 
  incidentId: string; 
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'planned': return 'bg-yellow-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrective Actions</CardTitle>
        <CardDescription>
          Actions taken or planned to prevent similar incidents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No corrective actions defined yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {actions.map((action) => (
              <div key={action.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{action.title}</h4>
                  <Badge className={`${getStatusColor(action.status)} text-white`}>
                    {action.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{action.description}</p>
                
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{action.assigned_to.first_name} {action.assigned_to.last_name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {format(new Date(action.due_date), 'PP')}</span>
                  </div>
                  
                  {action.completed_at && (
                    <div className="flex items-center space-x-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Completed: {format(new Date(action.completed_at), 'PP')}</span>
                    </div>
                  )}
                </div>
                
                {action.completion_notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">{action.completion_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}