// app/track/[trackingNumber]/page.tsx
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  MapPin, 
  Clock, 
  Truck, 
  User, 
  RefreshCw,
  CheckCircle,
  Circle,
  ArrowRight,
  Phone,
  Mail,
  AlertTriangle,
  Shield,
  Calendar
} from 'lucide-react';
import { usePublicShipmentTracking } from '@/hooks/usePublicTracking';

// Dynamically import map component to avoid SSR issues
const ShipmentTrackingMap = dynamic(
  () => import('@/components/maps/ShipmentTrackingMap').then(mod => ({ default: mod.ShipmentTrackingMap })),
  { 
    ssr: false,
    loading: () => (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading tracking map...</p>
          </div>
        </CardContent>
      </Card>
    )
  }
);

interface TrackingPageProps {
  params: Promise<{
    trackingNumber: string;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'IN_TRANSIT':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'OUT_FOR_DELIVERY':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'READY_FOR_DISPATCH':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'DELAYED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

const getStatusIcon = (status: string, isCompleted: boolean) => {
  if (isCompleted) {
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  }
  return <Circle className="h-5 w-5 text-gray-400" />;
};

export default function TrackingPage({ params }: TrackingPageProps) {
  const [trackingNumber, setTrackingNumber] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    params.then(p => setTrackingNumber(p.trackingNumber));
  }, [params]);
  const refreshInterval = 30000; // 30 seconds
  
  const { 
    data: shipmentData, 
    isLoading, 
    error, 
    refetch, 
    isRefetching 
  } = usePublicShipmentTracking(trackingNumber, refreshInterval);

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-[#153F9F]" />
            <h1 className="text-3xl font-bold text-gray-900">SafeShipper Tracking</h1>
          </div>
          
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error.message}
            </AlertDescription>
          </Alert>
          
          <div className="mt-6 text-center">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-[#153F9F]" />
            <h1 className="text-3xl font-bold text-gray-900">SafeShipper Tracking</h1>
          </div>
          
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-spin" />
                <p className="text-gray-500">Loading tracking information...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!shipmentData) {
    return null;
  }

  const currentStatusIndex = shipmentData.status_timeline.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="h-12 w-12 mx-auto mb-4 text-[#153F9F]" />
          <h1 className="text-3xl font-bold text-gray-900">SafeShipper Tracking</h1>
          <p className="text-gray-600 mt-2">Track your shipment in real-time</p>
        </div>

        {/* Shipment Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Shipment {trackingNumber}
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(shipmentData.status)}`}
                >
                  {formatStatus(shipmentData.status)}
                </Badge>
                <Button 
                  onClick={handleRefresh} 
                  variant="outline" 
                  size="sm"
                  disabled={isRefetching}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Route Information */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <MapPin className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                <p className="text-sm font-medium text-gray-900">{shipmentData.origin_location}</p>
                <p className="text-xs text-gray-500">From</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="text-center">
                <MapPin className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                <p className="text-sm font-medium text-gray-900">{shipmentData.destination_location}</p>
                <p className="text-xs text-gray-500">To</p>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shipmentData.estimated_delivery_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Estimated Delivery</p>
                    <p className="text-sm text-gray-600">
                      {new Date(shipmentData.estimated_delivery_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {shipmentData.driver_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Driver</p>
                    <p className="text-sm text-gray-600">{shipmentData.driver_name}</p>
                  </div>
                </div>
              )}

              {shipmentData.vehicle_registration && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Vehicle</p>
                    <p className="text-sm text-gray-600">***{shipmentData.vehicle_registration}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Live Tracking Status */}
            {shipmentData.route_info.has_live_tracking && shipmentData.vehicle_location && (
              <Alert className="border-green-200 bg-green-50">
                <MapPin className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Live tracking active:</strong> {shipmentData.route_info.privacy_note}
                  <br />
                  <span className="text-sm">
                    Last updated: {new Date(shipmentData.vehicle_location.last_updated).toLocaleString()}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Map and Timeline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Map */}
          <div>
            {shipmentData.vehicle_location ? (
              <ShipmentTrackingMap shipmentData={shipmentData} />
            ) : (
              <Card className="h-96">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 font-medium">Tracking Not Available</p>
                    <p className="text-sm text-gray-500 mt-2">{shipmentData.route_info.note}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Shipment Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shipmentData.status_timeline.map((item, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(item.status, isCompleted)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                            {item.description}
                          </p>
                          {isCurrent && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Support */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Support
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Us
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Having issues with your shipment? Our customer support team is here to help.
            </p>
          </CardContent>
        </Card>

        {/* Auto-refresh Info */}
        {shipmentData.route_info.has_live_tracking && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              This page automatically refreshes every {refreshInterval / 1000} seconds while tracking is active.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}