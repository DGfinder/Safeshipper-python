"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import {
  AlertTriangle,
  Plus,
  BarChart3,
  MapPin,
  List,
  TrendingUp,
} from "lucide-react";
import { usePermissions } from '@/contexts/PermissionContext';
import { IncidentListItem } from '@/shared/types/incident';
import IncidentDashboard from '@/components/incidents/IncidentDashboard';
import IncidentList from '@/components/incidents/IncidentList';
import IncidentForm from '@/components/incidents/IncidentForm';
import IncidentMapView from '@/components/incidents/IncidentMapView';

export default function IncidentsPage() {
  const { can } = usePermissions();
  const router = useRouter();
  const [selectedIncident, setSelectedIncident] = useState<IncidentListItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const canView = can('incidents.view');
  const canCreate = can('incidents.create');

  const handleIncidentSelect = (incident: IncidentListItem) => {
    setSelectedIncident(incident);
    router.push(`/incidents/${incident.id}`);
  };

  const handleCreateIncident = () => {
    setShowCreateDialog(true);
  };

  const handleCreateSuccess = (incident: any) => {
    setShowCreateDialog(false);
    router.push(`/incidents/${incident.id}`);
  };

  if (!canView) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              You do not have permission to view incidents.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Incident Management System
          </h1>
          <p className="text-gray-600">Comprehensive safety incident tracking and analytics</p>
        </div>
        
        {canCreate && (
          <Button onClick={handleCreateIncident} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Incident List
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Map View
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <IncidentDashboard
            onViewIncident={handleIncidentSelect}
            onCreateIncident={handleCreateIncident}
          />
        </TabsContent>

        {/* Incident List Tab */}
        <TabsContent value="list">
          <IncidentList onIncidentSelect={handleIncidentSelect} />
        </TabsContent>

        {/* Map View Tab */}
        <TabsContent value="map">
          <IncidentMapView
            onIncidentSelect={handleIncidentSelect}
            height="700px"
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Advanced analytics dashboard coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Incident Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report New Incident</DialogTitle>
          </DialogHeader>
          
          <IncidentForm
            mode="create"
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}