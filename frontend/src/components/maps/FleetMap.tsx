// components/maps/FleetMap.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon, DivIcon } from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Truck,
  User,
  Package,
  MapPin,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { type FleetVehicle } from "@/hooks/useFleetTracking";

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

interface FleetMapProps {
  vehicles: FleetVehicle[];
  onVehicleSelect?: (vehicle: FleetVehicle) => void;
  className?: string;
}

// Create custom vehicle markers
const createVehicleIcon = (vehicle: FleetVehicle): DivIcon => {
  const isOnline = vehicle.location_is_fresh;
  const hasActiveShipment = !!vehicle.active_shipment;

  let color = "gray";
  if (hasActiveShipment && isOnline) {
    color = vehicle.active_shipment?.status === "IN_TRANSIT" ? "green" : "blue";
  } else if (isOnline) {
    color = "orange";
  }

  return new DivIcon({
    html: `
      <div class="relative">
        <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${color}">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.6-1.6-1.6h-1.9c-.5 0-.9-.4-.9-.9V9c0-.6-.4-1-1-1h-6V6c0-1.1-.9-2-2-2s-2 .9-2 2v2H5c-.6 0-1 .4-1 1v1.5c0 .5-.4.9-.9.9H1.6C.7 11.4 0 12.1 0 13v3c0 .6.4 1 1 1h2c0 1.1.9 2 2 2s2-.9 2-2h10c0 1.1.9 2 2 2s2-.9 2-2zM7 19c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm12 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z"/>
          </svg>
        </div>
        ${!isOnline ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>' : ""}
      </div>
    `,
    className: "vehicle-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const getStatusColor = (status: string, isOnline: boolean) => {
  if (!isOnline) return "bg-gray-100 text-gray-800 border-gray-200";

  switch (status) {
    case "IN_TRANSIT":
      return "bg-green-100 text-green-800 border-green-200";
    case "READY_FOR_DISPATCH":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "OUT_FOR_DELIVERY":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "AVAILABLE":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function FleetMap({
  vehicles,
  onVehicleSelect,
  className,
}: FleetMapProps) {
  // Filter vehicles that have location data
  const vehiclesWithLocation = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.location && vehicle.location.lat && vehicle.location.lng,
      ),
    [vehicles],
  );

  // Calculate map center based on vehicle locations
  const mapCenter = useMemo(() => {
    if (vehiclesWithLocation.length === 0) {
      return [-37.8136, 144.9631]; // Melbourne default
    }

    const avgLat =
      vehiclesWithLocation.reduce((sum, v) => sum + v.location!.lat, 0) /
      vehiclesWithLocation.length;
    const avgLng =
      vehiclesWithLocation.reduce((sum, v) => sum + v.location!.lng, 0) /
      vehiclesWithLocation.length;

    return [avgLat, avgLng];
  }, [vehiclesWithLocation]);

  // Fix for Next.js SSR issues with Leaflet
  useEffect(() => {
    delete (Icon.Default.prototype as any)._getIconUrl;
    Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
  }, []);

  if (vehicles.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Fleet Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No vehicles found. Vehicles will appear here when they are
              assigned to shipments or have recent location updates.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (vehiclesWithLocation.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Fleet Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 bg-yellow-50">
            <MapPin className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {vehicles.length} vehicle(s) found, but none have location data
              available. Vehicles need to update their GPS position to appear on
              the map.
            </AlertDescription>
          </Alert>

          <div className="mt-4 space-y-2">
            <h4 className="font-medium text-sm text-gray-700">
              Vehicles without location:
            </h4>
            {vehicles.slice(0, 5).map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="font-mono text-sm">
                  {vehicle.registration_number}
                </span>
                <Badge variant="outline" className="text-xs">
                  No GPS
                </Badge>
              </div>
            ))}
            {vehicles.length > 5 && (
              <p className="text-xs text-gray-500">
                ... and {vehicles.length - 5} more
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Live Fleet Map
          </span>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{vehiclesWithLocation.length} vehicles on map</span>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-green-600">Online</span>
              <WifiOff className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Offline</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-96 w-full relative">
          <MapContainer
            center={mapCenter as [number, number]}
            zoom={10}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {vehiclesWithLocation.map((vehicle) => (
              <Marker
                key={vehicle.id}
                position={[vehicle.location!.lat, vehicle.location!.lng]}
                icon={createVehicleIcon(vehicle)}
                eventHandlers={{
                  click: () => onVehicleSelect?.(vehicle),
                }}
              >
                <Popup className="vehicle-popup">
                  <div className="min-w-64 space-y-3">
                    {/* Vehicle Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">
                        {vehicle.registration_number}
                      </h3>
                      <div className="flex items-center gap-2">
                        {vehicle.location_is_fresh ? (
                          <Wifi className="h-4 w-4 text-green-600" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(vehicle.status, vehicle.location_is_fresh)}`}
                        >
                          {vehicle.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>

                    {/* Driver Information */}
                    {vehicle.assigned_driver && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {vehicle.assigned_driver.name}
                        </span>
                      </div>
                    )}

                    {/* Active Shipment */}
                    {vehicle.active_shipment && (
                      <div className="border-t pt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Active Shipment</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <span className="font-medium">Tracking:</span>{" "}
                            {vehicle.active_shipment.tracking_number}
                          </p>
                          <p>
                            <span className="font-medium">Customer:</span>{" "}
                            {vehicle.active_shipment.customer_name}
                          </p>
                          <p>
                            <span className="font-medium">Route:</span>{" "}
                            {vehicle.active_shipment.origin_location} →{" "}
                            {vehicle.active_shipment.destination_location}
                          </p>
                          {vehicle.active_shipment.estimated_delivery_date && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span>
                                ETA:{" "}
                                {new Date(
                                  vehicle.active_shipment.estimated_delivery_date,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Vehicle Details */}
                    <div className="border-t pt-2 text-xs text-gray-500 space-y-1">
                      <p>
                        <span className="font-medium">Type:</span>{" "}
                        {vehicle.vehicle_type}
                      </p>
                      {vehicle.company && (
                        <p>
                          <span className="font-medium">Company:</span>{" "}
                          {vehicle.company.name}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Location:</span>{" "}
                        {vehicle.location!.lat.toFixed(4)},{" "}
                        {vehicle.location!.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
