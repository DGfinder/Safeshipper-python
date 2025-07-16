// app/track/[trackingNumber]/page.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
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
  Calendar,
  FileText,
  Download,
  MessageSquare,
  Info,
  Weight,
  Box,
} from "lucide-react";
import { usePublicShipmentTracking } from "@/shared/hooks/usePublicTracking";
import { useMockPublicTracking } from "@/shared/hooks/useMockAPI";

// Dynamically import map component to avoid SSR issues
const ShipmentTrackingMap = dynamic(
  () =>
    import("@/shared/components/maps/ShipmentTrackingMap").then((mod) => ({
      default: mod.ShipmentTrackingMap,
    })),
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
    ),
  },
);

interface TrackingPageProps {
  params: Promise<{
    trackingNumber: string;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "DELIVERED":
      return "bg-green-100 text-green-800 border-green-200";
    case "IN_TRANSIT":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "OUT_FOR_DELIVERY":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "READY_FOR_DISPATCH":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-200";
    case "DELAYED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const formatStatus = (status: string) => {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const getStatusIcon = (status: string, isCompleted: boolean) => {
  if (isCompleted) {
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  }
  return <Circle className="h-5 w-5 text-gray-400" />;
};

export default function TrackingPage({ params }: TrackingPageProps) {
  const [trackingNumber, setTrackingNumber] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    params.then((p) => setTrackingNumber(p.trackingNumber));
  }, [params]);
  const refreshInterval = 30000; // 30 seconds

  // Use mock API for demo
  const {
    data: shipmentData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useMockPublicTracking(trackingNumber || "demo-tracking");

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-[#153F9F]" />
            <h1 className="text-3xl font-bold text-gray-900">
              SafeShipper Tracking
            </h1>
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
            <h1 className="text-3xl font-bold text-gray-900">
              SafeShipper Tracking
            </h1>
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
          <h1 className="text-3xl font-bold text-gray-900">
            SafeShipper Tracking
          </h1>
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
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`}
                  />
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
                <p className="text-sm font-medium text-gray-900">
                  {shipmentData.origin_location}
                </p>
                <p className="text-xs text-gray-500">From</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="text-center">
                <MapPin className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                <p className="text-sm font-medium text-gray-900">
                  {shipmentData.destination_location}
                </p>
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
                      {new Date(
                        shipmentData.estimated_delivery_date,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {shipmentData.driver_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Driver</p>
                    <p className="text-sm text-gray-600">
                      {shipmentData.driver_name}
                    </p>
                  </div>
                </div>
              )}

              {shipmentData.vehicle_registration && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Vehicle</p>
                    <p className="text-sm text-gray-600">
                      ***{shipmentData.vehicle_registration}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Live Tracking Status */}
            {shipmentData.route_info.has_live_tracking &&
              shipmentData.vehicle_location && (
                <Alert className="border-green-200 bg-green-50">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Live tracking active:</strong>{" "}
                    {(shipmentData.route_info as any).privacy_note ||
                      "Location updated in real-time"}
                    <br />
                    <span className="text-sm">
                      Last updated:{" "}
                      {new Date(
                        shipmentData.vehicle_location.last_updated,
                      ).toLocaleString()}
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
                    <p className="text-gray-600 font-medium">
                      Tracking Not Available
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {(shipmentData.route_info as any).note ||
                        "Tracking will be available when shipment is in transit"}
                    </p>
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
                          <p
                            className={`text-sm font-medium ${isCurrent ? "text-blue-600" : isCompleted ? "text-gray-900" : "text-gray-500"}`}
                          >
                            {item.description}
                          </p>
                          {isCurrent && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
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

        {/* Shipment Details */}
        {shipmentData.items_summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                Shipment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Total Items</p>
                    <p className="text-lg font-semibold">
                      {shipmentData.items_summary.total_items}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Total Weight</p>
                    <p className="text-lg font-semibold">
                      {shipmentData.items_summary.total_weight_kg.toFixed(1)} kg
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {shipmentData.items_summary.has_dangerous_goods ? (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">Dangerous Goods</p>
                    <p className="text-lg font-semibold">
                      {shipmentData.items_summary.has_dangerous_goods
                        ? `${shipmentData.items_summary.dangerous_goods_count} items`
                        : "None"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Shipped</p>
                    <p className="text-sm text-gray-600">
                      {new Date(shipmentData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {shipmentData.documents && shipmentData.documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Shipment Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shipmentData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-sm">
                          {doc.type_display}
                        </p>
                        <p className="text-xs text-gray-500">{doc.filename}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {doc.status_display}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Uploaded{" "}
                            {new Date(doc.upload_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <a
                      href={doc.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Communications */}
        {shipmentData.communications &&
          shipmentData.communications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Updates & Communications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shipmentData.communications.map((comm) => (
                    <div
                      key={comm.id}
                      className="border-l-4 border-blue-200 pl-4 py-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">
                              {comm.subject}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {comm.type_display}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {comm.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>From: {comm.sender}</span>
                            <span>
                              {new Date(comm.sent_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Proof of Delivery - Only show for delivered shipments */}
        {shipmentData.status === "DELIVERED" &&
          shipmentData.proof_of_delivery && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  Proof of Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Your shipment was successfully delivered on{" "}
                    {new Date(
                      shipmentData.proof_of_delivery.delivery_date,
                    ).toLocaleDateString()}
                  </AlertDescription>
                </Alert>

                {/* Delivery Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    {shipmentData.proof_of_delivery.recipient_name && (
                      <p>
                        <span className="font-medium">Received by:</span>{" "}
                        {shipmentData.proof_of_delivery.recipient_name}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Delivered by:</span>{" "}
                      {shipmentData.proof_of_delivery.delivered_by}
                    </p>
                  </div>
                  <div>
                    <p>
                      <span className="font-medium">Date & Time:</span>{" "}
                      {new Date(
                        shipmentData.proof_of_delivery.delivery_date,
                      ).toLocaleString()}
                    </p>
                    {shipmentData.proof_of_delivery.delivery_photos.length >
                      0 && (
                      <p>
                        <span className="font-medium">Photos:</span>{" "}
                        {shipmentData.proof_of_delivery.delivery_photos.length}
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery Notes */}
                {shipmentData.proof_of_delivery.delivery_notes && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Delivery Notes</h4>
                    <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded border">
                      {shipmentData.proof_of_delivery.delivery_notes}
                    </p>
                  </div>
                )}

                {/* Signature */}
                {shipmentData.proof_of_delivery.recipient_signature_url && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      Recipient Signature
                    </h4>
                    <div className="border rounded p-2 bg-white">
                      <img
                        src={
                          shipmentData.proof_of_delivery.recipient_signature_url
                        }
                        alt="Recipient signature"
                        className="h-16 w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Delivery Photos */}
                {shipmentData.proof_of_delivery.delivery_photos &&
                  shipmentData.proof_of_delivery.delivery_photos.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">
                        Delivery Photos
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {shipmentData.proof_of_delivery.delivery_photos.map(
                          (photoUrl: string, index: number) => (
                            <img
                              key={index}
                              src={photoUrl}
                              alt={`Delivery photo ${index + 1}`}
                              className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90"
                              onClick={() => window.open(photoUrl, "_blank")}
                            />
                          ),
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Click on photos to view full size
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

        {/* Customer Support */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Contact Support
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email Us
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Having issues with your shipment? Our customer support team is
              here to help.
            </p>
          </CardContent>
        </Card>

        {/* Auto-refresh Info */}
        {shipmentData.route_info.has_live_tracking && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              This page automatically refreshes every {refreshInterval / 1000}{" "}
              seconds while tracking is active.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
