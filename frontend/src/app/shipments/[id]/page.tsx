// app/shipments/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Package,
  Truck,
  User,
  MapPin,
  Calendar,
  FileText,
  Eye,
  Edit,
  Settings,
  Box,
  ArrowRight,
  MessageSquare,
  Shield,
  CheckCircle,
  Info,
  Map,
  Paperclip,
  ClipboardCheck,
  LayoutPanelTop,
  Phone,
  Mail,
  Clock,
  ChevronLeft,
  Plus,
} from "lucide-react";
import { AuthGuard } from "@/shared/components/common/auth-guard";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import { ActivityLog } from "@/shared/components/communications/ActivityLog";
import { HazardInspection } from "@/shared/components/inspections/HazardInspection";
import { ProofOfDelivery } from "@/shared/components/delivery/ProofOfDelivery";
import DocumentGenerator from "@/shared/components/documents/DocumentGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ShipmentEmergencyPlanViewer } from "@/shared/components/epg/ShipmentEmergencyPlanViewer";
import { simulatedDataService } from "@/shared/services/simulatedDataService";
import Link from "next/link";

interface ShipmentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Function to convert simulated data to shipment detail format
const convertToShipmentDetail = (shipmentData: any) => {
  if (!shipmentData) return null;
  
  const [origin, destination] = shipmentData.route.split(" → ");
  
  return {
    id: shipmentData.id,
    tracking_number: shipmentData.trackingNumber,
    status: shipmentData.status,
    customer: {
      name: shipmentData.client,
      email: `contact@${shipmentData.client.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.au`,
      phone: "+61 8 9234 5678",
    },
    origin_location: origin,
    destination_location: destination,
    estimated_delivery_date: shipmentData.estimatedDelivery,
    created_at: shipmentData.createdAt,
    assigned_vehicle: {
      registration_number: shipmentData.vehicle || "TBD",
      driver_name: shipmentData.driver || "TBD",
      vehicle_type: "Road Train",
    },
    consignment_items: shipmentData.dangerousGoods.length > 0 
      ? shipmentData.dangerousGoods.map((dg: any, index: number) => ({
          id: (index + 1).toString(),
          description: dg.properShippingName,
          un_number: dg.unNumber,
          dangerous_goods_class: dg.class,
          quantity: dg.count,
          weight_kg: parseInt(dg.quantity) || 100,
          dimensions: "1.2×0.8×0.4m",
        }))
      : [
          {
            id: "1",
            description: "General Freight",
            dangerous_goods_class: "GENERAL",
            quantity: 1,
            weight_kg: 1000,
            dimensions: "2.0×1.5×1.0m",
          },
        ],
    load_plan: null,
  };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "READY_FOR_DISPATCH":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "IN_TRANSIT":
      return "bg-green-100 text-green-800 border-green-200";
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getDGClassColor = (dgClass: string) => {
  const colors: { [key: string]: string } = {
    "1": "bg-orange-100 text-orange-800 border-orange-200",
    "2": "bg-teal-100 text-teal-800 border-teal-200",
    "3": "bg-red-100 text-red-800 border-red-200",
    "4": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "5": "bg-blue-100 text-blue-800 border-blue-200",
    "6": "bg-purple-100 text-purple-800 border-purple-200",
    "7": "bg-pink-100 text-pink-800 border-pink-200",
    "8": "bg-gray-100 text-gray-800 border-gray-200",
    "9": "bg-indigo-100 text-indigo-800 border-indigo-200",
    GENERAL: "bg-slate-100 text-slate-800 border-slate-200",
  };
  return colors[dgClass] || colors["GENERAL"];
};

export default function ShipmentDetailPage({
  params,
}: ShipmentDetailPageProps) {
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [shipment, setShipment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    params.then((p) => {
      // Decode URL parameter to handle any encoding issues
      const decodedId = decodeURIComponent(p.id);
      setShipmentId(decodedId);
      
      // Find the shipment in the simulated data
      const allShipments = simulatedDataService.getShipments();
      
      const foundShipment = allShipments.find(s => s.id === decodedId);
      
      if (foundShipment) {
        setShipment(convertToShipmentDetail(foundShipment));
        setNotFound(false);
      } else {
        console.log('❌ Shipment not found:', decodedId);
        console.log('Available IDs:', allShipments.map(s => s.id).slice(0, 10));
        setShipment(null);
        setNotFound(true);
      }
    });
  }, [params]);

  if (!shipmentId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center">
            <Package className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading shipment details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Shipment Not Found</h1>
            <p className="text-gray-600 mb-4">
              The shipment with ID "{shipmentId}" could not be found.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Available shipment IDs: OH-1-2024 through OH-150-2024
            </p>
            <Link href="/shipments">
              <Button className="bg-[#153F9F] hover:bg-[#153F9F]/90">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Shipments
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!shipment) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center">
            <Package className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading shipment details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalWeight = shipment.consignment_items.reduce(
    (sum: number, item: any) => sum + item.weight_kg,
    0,
  );
  const totalItems = shipment.consignment_items.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/shipments" className="hover:text-gray-900">
            Shipments
          </Link>
          <ChevronLeft className="h-4 w-4 rotate-180" />
          <span className="font-medium">{shipment.tracking_number}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{shipment.tracking_number}</h1>
            <div className="flex items-center gap-2 mt-1">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                Client: {shipment.customer.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`${getStatusColor(shipment.status)}`}
            >
              {shipment.status.replace("_", " ")}
            </Badge>
            <Button className="bg-[#153F9F] hover:bg-[#153F9F]/90">
              Start trip
            </Button>
          </div>
        </div>

        {/* Tab System */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Info
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Map
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attached files
            </TabsTrigger>
            <TabsTrigger value="inspection" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Hazard inspection
            </TabsTrigger>
            <TabsTrigger value="loadplan" className="flex items-center gap-2">
              <LayoutPanelTop className="h-4 w-4" />
              Load plan
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="emergency" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Emergency Plan
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            {/* Tracking Section */}
            <Card>
              <CardHeader>
                <CardTitle>Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-green-800">
                          TRACKING PLANNED CREATED
                        </p>
                        <p className="text-sm text-green-600">
                          {shipment.origin_location}
                        </p>
                        <p className="text-xs text-green-500">
                          12:34 3 Dec 2024
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-blue-800">
                          OUT FOR DELIVERY
                        </p>
                        <p className="text-sm text-blue-600">
                          {shipment.origin_location}
                        </p>
                        <p className="text-xs text-blue-500">3:30 AM</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-600">DELIVERED</p>
                        <p className="text-sm text-gray-500">
                          {shipment.destination_location}
                        </p>
                        <p className="text-xs text-gray-400">10:00 AM</p>
                      </div>
                    </div>
                  </div>

                  {/* Map placeholder */}
                  <div className="md:col-span-2">
                    <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                      <div className="text-center">
                        <Map className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">
                          Interactive map would be displayed here
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Route: {shipment.origin_location} →{" "}
                          {shipment.destination_location}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client & Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Company</p>
                    <p className="font-medium">{shipment.customer.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{shipment.customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{shipment.customer.phone}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shipment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Items
                      </p>
                      <p className="font-medium">{totalItems}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Weight
                      </p>
                      <p className="font-medium">
                        {totalWeight.toLocaleString()} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Vehicle
                      </p>
                      <p className="font-medium">
                        {shipment.assigned_vehicle.registration_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Driver
                      </p>
                      <p className="font-medium">
                        {shipment.assigned_vehicle.driver_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      ETA:{" "}
                      {new Date(
                        shipment.estimated_delivery_date,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Consignment Items */}
            <Card>
              <CardHeader>
                <CardTitle>Consignment Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shipment.consignment_items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Package className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{item.description}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            {item.un_number && (
                              <Badge
                                className={getDGClassColor(
                                  item.dangerous_goods_class,
                                )}
                              >
                                {item.un_number} - Class{" "}
                                {item.dangerous_goods_class}
                              </Badge>
                            )}
                            <span>Qty: {item.quantity}</span>
                            <span>{item.weight_kg}kg</span>
                            <span>{item.dimensions}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            <Card>
              <CardContent className="p-0">
                <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                  <div className="text-center">
                    <Map className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">
                      Interactive Route Map
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Real-time tracking from {shipment.origin_location} to{" "}
                      {shipment.destination_location}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <div className="space-y-6">
              {/* Manifest Upload Section */}
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Shield className="h-5 w-5" />
                    Manifest Validation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-blue-800">
                      Upload and validate PDF manifests to automatically detect
                      dangerous goods and ensure compliance.
                    </p>

                    <div className="space-y-2 text-xs text-blue-700">
                      <p>✓ Automatic dangerous goods detection</p>
                      <p>✓ Compatibility rule validation</p>
                      <p>✓ Compliance document generation</p>
                      <p>✓ PDF manifest processing</p>
                    </div>

                    <Link href={`/shipments/${shipmentId}/validate`}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        <FileText className="h-4 w-4 mr-2" />
                        Upload & Validate Manifest
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Existing Files */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Attached Files
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add new file
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["EPG", "EPG", "EPG", "EPG", "SDS"].map((type, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <span className="font-medium">{type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{type}</span>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Hazard Inspection Tab */}
          <TabsContent value="inspection">
            <HazardInspection shipmentId={shipmentId} />
          </TabsContent>

          {/* Load Plan Tab */}
          <TabsContent value="loadplan">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Load Plan</CardTitle>
                    <Link href={`/shipments/${shipmentId}/load-plan`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Plan
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                    <div className="text-center">
                      <LayoutPanelTop className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        3D Load Plan Visualization
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Interactive truck loading layout
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Load Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Total Weight
                        </p>
                        <p className="text-lg font-bold">
                          {totalWeight.toLocaleString()} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Vehicle Capacity
                        </p>
                        <p className="text-lg font-bold">20,000 kg</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Load Utilization</span>
                        <span>{Math.round((totalWeight / 20000) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(totalWeight / 20000) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Real-time Chat</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Communication with driver and stakeholders
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Plan Tab */}
          <TabsContent value="emergency">
            <ShipmentEmergencyPlanViewer
              shipmentId={shipmentId}
              shipmentData={shipment}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
