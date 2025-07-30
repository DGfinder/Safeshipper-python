"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { usePermissions } from '@/contexts/PermissionContext';
import { incidentService } from '@/shared/services/incidentService';
import { Incident } from '@/shared/types/incident';
import IncidentDetail from '@/components/incidents/IncidentDetail';
import IncidentForm from '@/components/incidents/IncidentForm';
import IncidentMapView from '@/components/incidents/IncidentMapView';

export default function IncidentDetailPage() {
  const { can } = usePermissions();
  const router = useRouter();
  const params = useParams();
  const incidentId = params?.id as string;
  
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const canView = can('incidents.view');
  const canEdit = can('incidents.edit');

  useEffect(() => {
    if (!canView) {
      router.push('/incidents');
      return;
    }

    const fetchIncident = async () => {
      if (!incidentId) return;
      
      try {
        setLoading(true);
        const data = await incidentService.getIncident(incidentId);
        setIncident(data);
      } catch (error) {
        console.error('Error fetching incident:', error);
        // Redirect to incidents list if not found or no access
        router.push('/incidents');
      } finally {
        setLoading(false);
      }
    };

    fetchIncident();
  }, [incidentId, canView, router]);

  const handleEditSuccess = (updatedIncident: Incident) => {
    setIncident(updatedIncident);
    setEditMode(false);
  };

  const handleEditCancel = () => {
    setEditMode(false);
  };

  if (!canView) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              You do not have permission to view incidents.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3">Loading incident details...</span>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Incident not found.</p>
            <Button onClick={() => router.push('/incidents')} className="mt-4">
              Back to Incidents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/incidents">Incidents</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{incident.incident_number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/incidents')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Incidents</span>
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">{incident.title}</h1>
            <p className="text-gray-600">{incident.incident_number}</p>
          </div>
        </div>

        {canEdit && incident.status !== 'closed' && (
          <Button onClick={() => setEditMode(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Incident
          </Button>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="investigation">Investigation</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <IncidentDetail
            incidentId={incident.id}
            onEdit={() => setEditMode(true)}
            onClose={() => router.push('/incidents')}
          />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Incident Timeline</CardTitle>
              <CardDescription>
                Detailed timeline of all incident activities and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IncidentDetail
                incidentId={incident.id}
                onEdit={() => setEditMode(true)}
                onClose={() => router.push('/incidents')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Supporting Documents</CardTitle>
              <CardDescription>
                Photos, reports, witness statements, and other documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IncidentDetail
                incidentId={incident.id}
                onEdit={() => setEditMode(true)}
                onClose={() => router.push('/incidents')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investigation Tab */}
        <TabsContent value="investigation">
          <Card>
            <CardHeader>
              <CardTitle>Investigation & Analysis</CardTitle>
              <CardDescription>
                Root cause analysis, contributing factors, and corrective actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IncidentDetail
                incidentId={incident.id}
                onEdit={() => setEditMode(true)}
                onClose={() => router.push('/incidents')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Tab - Map View */}
        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle>Incident Location</CardTitle>
              <CardDescription>
                Geographic location and nearby incidents for context
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {incident.coordinates ? (
                <IncidentMapView
                  initialFilters={{
                    // Show incidents in the same area for context
                    // This could be enhanced with geospatial queries
                  }}
                  onIncidentSelect={(selectedIncident) => {
                    if (selectedIncident.id !== incident.id) {
                      router.push(`/incidents/${selectedIncident.id}`);
                    }
                  }}
                  height="500px"
                />
              ) : (
                <div className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No location coordinates available for this incident.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Location: {incident.location}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Incident</DialogTitle>
            <DialogDescription>
              Update incident details, add documentation, or change status
            </DialogDescription>
          </DialogHeader>
          
          <IncidentForm
            incident={incident}
            mode="edit"
            onSuccess={handleEditSuccess}
            onCancel={handleEditCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}