// app/shipments/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ArrowRight
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import Link from 'next/link';

interface ShipmentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Mock shipment data for demo
const createMockShipment = (id: string) => ({
  id,
  tracking_number: `SS-${id.toUpperCase()}-2024`,
  status: 'READY_FOR_DISPATCH',
  customer: {
    name: 'Global Manufacturing Inc.',
    email: 'logistics@globalmanufacturing.com',
    phone: '+1 (555) 123-4567'
  },
  origin_location: 'Sydney, NSW, Australia',
  destination_location: 'Melbourne, VIC, Australia',
  estimated_delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  assigned_vehicle: {
    registration_number: 'TRK-001',
    driver_name: 'John Smith',
    vehicle_type: 'Heavy Duty Truck'
  },
  consignment_items: [
    {
      id: '1',
      description: 'Lithium Battery Packs',
      un_number: 'UN3480',
      dangerous_goods_class: '9',
      quantity: 5,
      weight_kg: 125,
      dimensions: '1.2×0.8×0.4m'
    },
    {
      id: '2',
      description: 'Diesel Fuel Containers',
      un_number: 'UN1202', 
      dangerous_goods_class: '3',
      quantity: 2,
      weight_kg: 1600,
      dimensions: '1.0×1.0×1.0m'
    },
    {
      id: '3',
      description: 'Compressed Gas Cylinders',
      un_number: 'UN1950',
      dangerous_goods_class: '2',
      quantity: 4,
      weight_kg: 200,
      dimensions: '0.3×0.3×1.5m'
    },
    {
      id: '4',
      description: 'Medical Equipment',
      dangerous_goods_class: 'GENERAL',
      quantity: 3,
      weight_kg: 600,
      dimensions: '1.5×1.0×0.8m'
    }
  ],
  load_plan: null // Will be set when generated
});

const getStatusColor = (status: string) => {
  switch (status) {
    case 'READY_FOR_DISPATCH':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'IN_TRANSIT':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getDGClassColor = (dgClass: string) => {
  const colors: { [key: string]: string } = {
    '1': 'bg-orange-100 text-orange-800 border-orange-200',
    '2': 'bg-teal-100 text-teal-800 border-teal-200',
    '3': 'bg-red-100 text-red-800 border-red-200',
    '4': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    '5': 'bg-blue-100 text-blue-800 border-blue-200',
    '6': 'bg-purple-100 text-purple-800 border-purple-200',
    '7': 'bg-pink-100 text-pink-800 border-pink-200',
    '8': 'bg-gray-100 text-gray-800 border-gray-200',
    '9': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'GENERAL': 'bg-slate-100 text-slate-800 border-slate-200'
  };
  return colors[dgClass] || colors['GENERAL'];
};

export default function ShipmentDetailPage({ params }: ShipmentDetailPageProps) {
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [shipment, setShipment] = useState<any>(null);

  useEffect(() => {
    params.then(p => {
      setShipmentId(p.id);
      setShipment(createMockShipment(p.id));
    });
  }, [params]);

  if (!shipmentId || !shipment) {
    return (
      <AuthGuard>
        <div className="p-6">
          <div className="text-center">
            <Package className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading shipment details...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const totalWeight = shipment.consignment_items.reduce((sum: number, item: any) => sum + item.weight_kg, 0);
  const totalItems = shipment.consignment_items.reduce((sum: number, item: any) => sum + item.quantity, 0);

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Shipment Details</h1>
            <p className="text-gray-600 mt-1">
              Tracking: {shipment.tracking_number}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={`${getStatusColor(shipment.status)}`}
            >
              {shipment.status.replace('_', ' ')}
            </Badge>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Shipment
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold">{totalItems}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Weight</p>
                  <p className="text-2xl font-bold">{totalWeight.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                <Box className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vehicle</p>
                  <p className="text-2xl font-bold">{shipment.assigned_vehicle.registration_number}</p>
                </div>
                <Truck className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ETA</p>
                  <p className="text-lg font-bold">{new Date(shipment.estimated_delivery_date).toLocaleDateString()}</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Shipment Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Route */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer & Route Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {shipment.customer.name}</p>
                    <p><span className="font-medium">Email:</span> {shipment.customer.email}</p>
                    <p><span className="font-medium">Phone:</span> {shipment.customer.phone}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Route Information</h4>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <MapPin className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                      <p className="text-sm font-medium">{shipment.origin_location}</p>
                      <p className="text-xs text-gray-500">Origin</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                    <div className="text-center">
                      <MapPin className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                      <p className="text-sm font-medium">{shipment.destination_location}</p>
                      <p className="text-xs text-gray-500">Destination</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Consignment Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Consignment Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {shipment.consignment_items.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{item.description}</h4>
                        <div className="flex items-center gap-2">
                          {item.un_number && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {item.un_number}
                            </Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getDGClassColor(item.dangerous_goods_class)}`}
                          >
                            {item.dangerous_goods_class === 'GENERAL' ? 'General' : `Class ${item.dangerous_goods_class}`}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <p><span className="font-medium">Quantity:</span> {item.quantity}</p>
                        <p><span className="font-medium">Weight:</span> {item.weight_kg} kg</p>
                        <p><span className="font-medium">Dimensions:</span> {item.dimensions}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions & Tools */}
          <div className="space-y-6">
            {/* Load Planning */}
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Settings className="h-5 w-5" />
                  3D Load Planning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-blue-800">
                  Generate an optimized 3D visualization showing how to efficiently load all items into the vehicle.
                </p>
                
                <div className="space-y-2 text-xs text-blue-700">
                  <p>✓ 3D spatial optimization</p>
                  <p>✓ Dangerous goods compatibility</p>
                  <p>✓ Weight distribution analysis</p>
                  <p>✓ Interactive visualization</p>
                </div>

                <Link href={`/shipments/${shipmentId}/load-plan`}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Box className="h-4 w-4 mr-2" />
                    Open Load Planner
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Assigned Vehicle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p><span className="font-medium">Registration:</span> {shipment.assigned_vehicle.registration_number}</p>
                  <p><span className="font-medium">Type:</span> {shipment.assigned_vehicle.vehicle_type}</p>
                  <p><span className="font-medium">Driver:</span> {shipment.assigned_vehicle.driver_name}</p>
                </div>
                
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View Vehicle Details
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Documentation
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Eye className="h-4 w-4 mr-2" />
                  Track Shipment
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  View on Map
                </Button>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Shipment created</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Ready for dispatch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-gray-500">In transit</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}