// components/epg/ShipmentEmergencyPlanViewer.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { 
  Shield, 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Clock, 
  Eye, 
  Download, 
  RefreshCw,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  Zap,
  Activity,
  Plus
} from "lucide-react";
import { useEmergencyPlan, useGenerateEmergencyPlan } from "@/shared/hooks/useEPG";

interface ShipmentEmergencyPlanViewerProps {
  shipmentId: string;
  shipmentData?: {
    tracking_number: string;
    consignment_items: Array<{
      dangerous_goods_class?: string;
      un_number?: string;
      description: string;
    }>;
    origin_location: string;
    destination_location: string;
  };
}

export const ShipmentEmergencyPlanViewer: React.FC<ShipmentEmergencyPlanViewerProps> = ({
  shipmentId,
  shipmentData
}) => {
  const { data: emergencyPlan, isLoading, refetch } = useEmergencyPlan(shipmentId);
  const generatePlan = useGenerateEmergencyPlan();
  const [showFullPlan, setShowFullPlan] = useState(false);

  const handleGeneratePlan = async () => {
    try {
      await generatePlan.mutateAsync(shipmentId);
      refetch();
    } catch (error) {
      console.error("Failed to generate emergency plan:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "APPROVED":
        return "bg-blue-100 text-blue-800";
      case "REVIEWED":
        return "bg-yellow-100 text-yellow-800";
      case "GENERATED":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const dangerousGoods = shipmentData?.consignment_items?.filter(item => item.dangerous_goods_class) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!emergencyPlan) {
    return (
      <div className="space-y-4">
        {/* Generate Emergency Plan */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Emergency Plan Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-orange-800">
                This shipment contains dangerous goods and requires an emergency response plan. 
                Generate a comprehensive plan based on the cargo hazard profile.
              </p>

              {dangerousGoods.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-orange-900">Dangerous Goods Detected:</h4>
                  <div className="space-y-1">
                    {dangerousGoods.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Badge variant="destructive" className="text-xs">
                          {item.un_number} - Class {item.dangerous_goods_class}
                        </Badge>
                        <span className="text-orange-800">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs text-orange-700">
                <p>✓ Hazard-specific emergency procedures</p>
                <p>✓ Route-based emergency contacts</p>
                <p>✓ Hospital locations along route</p>
                <p>✓ Regulatory compliance documentation</p>
              </div>

              <Button 
                onClick={handleGeneratePlan}
                disabled={generatePlan.isPending}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {generatePlan.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Generate Emergency Plan
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              General Emergency Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="font-semibold text-red-800 mb-2">In Case of Emergency:</h4>
                <ol className="list-decimal list-inside space-y-1 text-red-700">
                  <li>Ensure personal safety first</li>
                  <li>Call emergency services (000)</li>
                  <li>Notify dispatch immediately</li>
                  <li>Evacuate area if necessary</li>
                  <li>Provide manifest information to responders</li>
                </ol>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-semibold text-blue-800 mb-2">Emergency Contacts</h4>
                  <div className="space-y-1 text-blue-700 text-xs">
                    <p>Emergency Services: 000</p>
                    <p>Poison Control: 13 11 26</p>
                    <p>CHEMCALL: 1800 127 406</p>
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-semibold text-green-800 mb-2">Required Documents</h4>
                  <div className="space-y-1 text-green-700 text-xs">
                    <p>✓ Dangerous Goods Manifest</p>
                    <p>✓ Emergency Procedure Guides</p>
                    <p>✓ Safety Data Sheets</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Emergency Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Emergency Response Plan
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(emergencyPlan.status)}>
                {emergencyPlan.status_display}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setShowFullPlan(true)}>
                <Eye className="h-4 w-4 mr-1" />
                View Full Plan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Plan Number</p>
              <p className="font-medium">{emergencyPlan.plan_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Generated</p>
              <p className="font-medium">
                {new Date(emergencyPlan.generated_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Referenced EPGs</p>
              <p className="font-medium">{emergencyPlan.referenced_epgs_display?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {emergencyPlan.executive_summary}
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5 text-red-600" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {emergencyPlan.route_emergency_contacts?.emergency_services && (
                <div className="flex justify-between">
                  <span>Emergency Services</span>
                  <span className="font-medium">
                    {emergencyPlan.route_emergency_contacts.emergency_services}
                  </span>
                </div>
              )}
              {emergencyPlan.route_emergency_contacts?.chemcall && (
                <div className="flex justify-between">
                  <span>CHEMCALL</span>
                  <span className="font-medium">
                    {emergencyPlan.route_emergency_contacts.chemcall}
                  </span>
                </div>
              )}
              {emergencyPlan.route_emergency_contacts?.poison_control && (
                <div className="flex justify-between">
                  <span>Poison Control</span>
                  <span className="font-medium">
                    {emergencyPlan.route_emergency_contacts.poison_control}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Nearest Hospitals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {emergencyPlan.hospital_locations?.slice(0, 3).map((hospital: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 rounded">
                  <p className="font-medium">{hospital.name}</p>
                  <p className="text-xs text-gray-600">{hospital.address}</p>
                </div>
              )) || (
                <p className="text-gray-500 text-xs">Hospital locations will be populated based on route</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Immediate Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-700">
              <p className="whitespace-pre-wrap">
                {emergencyPlan.immediate_response_actions?.substring(0, 150)}
                {emergencyPlan.immediate_response_actions?.length > 150 && '...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referenced EPGs */}
      {emergencyPlan.referenced_epgs_display && emergencyPlan.referenced_epgs_display.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Referenced Emergency Procedure Guides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {emergencyPlan.referenced_epgs_display.map((epg: any) => (
                <div key={epg.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{epg.epg_number}</span>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">{epg.title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Plan Dialog */}
      <Dialog open={showFullPlan} onOpenChange={setShowFullPlan}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emergency Response Plan - {emergencyPlan.plan_number}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="procedures">Procedures</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="hazards">Hazards</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Executive Summary</h3>
                <p className="text-sm whitespace-pre-wrap">{emergencyPlan.executive_summary}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Immediate Response Actions</h3>
                <p className="text-sm whitespace-pre-wrap">{emergencyPlan.immediate_response_actions}</p>
              </div>
            </TabsContent>

            <TabsContent value="procedures" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Specialized Procedures</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(emergencyPlan.specialized_procedures || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="p-3 border rounded">
                      <h4 className="font-medium capitalize">{key.replace('_', ' ')}</h4>
                      <p className="text-gray-700 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Emergency Contacts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(emergencyPlan.route_emergency_contacts || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="p-3 border rounded">
                      <h4 className="font-medium capitalize">{key.replace('_', ' ')}</h4>
                      <p className="text-lg font-mono">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Hospital Locations</h3>
                <div className="space-y-2">
                  {emergencyPlan.hospital_locations?.map((hospital: any, index: number) => (
                    <div key={index} className="p-3 border rounded">
                      <h4 className="font-medium">{hospital.name}</h4>
                      <p className="text-sm text-gray-600">{hospital.address}</p>
                      <p className="text-sm text-gray-600">Phone: {hospital.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hazards" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Hazard Assessment</h3>
                <div className="space-y-2">
                  {Object.entries(emergencyPlan.hazard_assessment || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="p-3 border rounded">
                      <h4 className="font-medium capitalize">{key.replace('_', ' ')}</h4>
                      <div className="text-sm text-gray-700 mt-1">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowFullPlan(false)}>
              Close
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};