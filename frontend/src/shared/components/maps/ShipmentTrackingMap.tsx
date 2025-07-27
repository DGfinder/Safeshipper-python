// components/maps/ShipmentTrackingMap.tsx
"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon, DivIcon } from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { MapPin, Truck, Clock, Navigation } from "lucide-react";
import { type PublicTrackingInfo } from "@/shared/services/shipmentService";

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

interface ShipmentTrackingMapProps {
  shipmentData: PublicTrackingInfo;
  className?: string;
}

// Create custom vehicle marker
const createVehicleIcon = (): DivIcon => {
  return new DivIcon({
    html: `
      <div class="relative">
        <div class="w-10 h-10 rounded-full border-3 border-white shadow-lg flex items-center justify-center bg-blue-500">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.6-1.6-1.6h-1.9c-.5 0-.9-.4-.9-.9V9c0-.6-.4-1-1-1h-6V6c0-1.1-.9-2-2-2s-2 .9-2 2v2H5c-.6 0-1 .4-1 1v1.5c0 .5-.4.9-.9.9H1.6C.7 11.4 0 12.1 0 13v3c0 .6.4 1 1 1h2c0 1.1.9 2 2 2s2-.9 2-2h10c0 1.1.9 2 2 2s2-.9 2-2zM7 19c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm12 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-blue-500"></div>
      </div>
    `,
    className: "vehicle-marker-public",
    iconSize: [40, 48],
    iconAnchor: [20, 48],
  });
};

export function ShipmentTrackingMap({
  shipmentData,
  className,
}: ShipmentTrackingMapProps) {
  const { vehicle_location } = shipmentData;

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

  if (!vehicle_location) {
    return null;
  }

  const mapCenter: [number, number] = [
    vehicle_location.latitude,
    vehicle_location.longitude,
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Live Vehicle Location
          </span>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${vehicle_location.is_fresh ? "bg-green-500" : "bg-orange-500"}`}
            ></div>
            <span className="text-sm text-gray-600">
              {vehicle_location.is_fresh ? "Live" : "Last known"}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-96 w-full relative">
          <MapContainer
            center={mapCenter}
            zoom={13}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={mapCenter} icon={createVehicleIcon()}>
              <Popup className="vehicle-popup-public">
                <div className="min-w-48 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Your Shipment</h3>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        shipmentData.status === "IN_TRANSIT"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-orange-50 text-orange-700 border-orange-200"
                      }`}
                    >
                      {shipmentData.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Tracking Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-500" />
                      <span>
                        Vehicle ***{shipmentData.vehicle_registration}
                      </span>
                    </div>

                    {shipmentData.driver_name && (
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-gray-500" />
                        <span>Driver: {shipmentData.driver_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        Updated:{" "}
                        {new Date(
                          vehicle_location.last_updated,
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Route */}
                  <div className="border-t pt-2">
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">From:</span>{" "}
                        {shipmentData.origin_location}
                      </p>
                      <p>
                        <span className="font-medium">To:</span>{" "}
                        {shipmentData.destination_location}
                      </p>
                    </div>
                  </div>

                  {/* Coordinates */}
                  <div className="border-t pt-2 text-xs text-gray-500">
                    <p>
                      {vehicle_location.latitude.toFixed(4)},{" "}
                      {vehicle_location.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* Map Footer */}
        <div className="p-3 bg-gray-50 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>Current location of your shipment</span>
          </div>
          <div className="text-xs text-gray-500">
            Last updated:{" "}
            {new Date(vehicle_location.last_updated).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
