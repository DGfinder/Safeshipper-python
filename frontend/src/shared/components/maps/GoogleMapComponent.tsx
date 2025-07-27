"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { 
  MapPin, 
  Navigation, 
  Route, 
  AlertTriangle,
  Truck,
  Package,
  Clock,
  RefreshCw
} from "lucide-react";

// Google Maps types
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    position: { lat: number; lng: number };
    title: string;
    type?: 'vehicle' | 'shipment' | 'destination' | 'warning';
    info?: any;
  }>;
  routes?: Array<{
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    waypoints?: Array<{ lat: number; lng: number }>;
    color?: string;
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (markerId: string) => void;
  className?: string;
  height?: string;
  showTraffic?: boolean;
  showSatellite?: boolean;
  restrictedZones?: Array<{
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    title: string;
    restrictions: string[];
  }>;
}

export const GoogleMapComponent: React.FC<GoogleMapProps> = ({
  center = { lat: -33.8688, lng: 151.2093 }, // Sydney default
  zoom = 10,
  markers = [],
  routes = [],
  onMapClick,
  onMarkerClick,
  className = "",
  height = "400px",
  showTraffic = false,
  showSatellite = false,
  restrictedZones = []
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directions, setDirections] = useState<any[]>([]);
  const markersRef = useRef<any[]>([]);
  const trafficLayerRef = useRef<any>(null);

  // Load Google Maps API
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    // Check if already loaded
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoaded(true);
    };
    
    script.onerror = () => {
      setError("Failed to load Google Maps API");
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    try {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: showSatellite ? 'satellite' : 'roadmap',
        styles: [
          // Custom styling for dangerous goods transport
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }]
          }
        ],
        // Disable some controls for cleaner interface
        streetViewControl: false,
        fullscreenControl: true,
        mapTypeControl: true,
        zoomControl: true
      });

      // Add click listener
      if (onMapClick) {
        newMap.addListener('click', (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          onMapClick(lat, lng);
        });
      }

      setMap(newMap);
    } catch (err) {
      setError("Failed to initialize map");
      console.error("Map initialization error:", err);
    }
  }, [isLoaded, center, zoom, onMapClick, showSatellite]);

  // Update markers
  useEffect(() => {
    if (!map || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach(markerData => {
      const marker = new window.google.maps.Marker({
        position: markerData.position,
        map,
        title: markerData.title,
        icon: getMarkerIcon(markerData.type)
      });

      // Add info window
      if (markerData.info) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: createInfoWindowContent(markerData)
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          if (onMarkerClick) {
            onMarkerClick(markerData.id);
          }
        });
      }

      markersRef.current.push(marker);
    });
  }, [map, markers, onMarkerClick]);

  // Update routes
  useEffect(() => {
    if (!map || !window.google || routes.length === 0) return;

    // Clear existing directions
    directions.forEach(renderer => renderer.setMap(null));
    setDirections([]);

    const newDirections: any[] = [];

    routes.forEach((route, index) => {
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        polylineOptions: {
          strokeColor: route.color || '#2563eb',
          strokeWeight: 4,
          strokeOpacity: 0.8
        },
        suppressMarkers: true // We'll use custom markers
      });

      directionsRenderer.setMap(map);

      const waypoints = route.waypoints?.map(wp => ({
        location: new window.google.maps.LatLng(wp.lat, wp.lng),
        stopover: true
      })) || [];

      directionsService.route({
        origin: new window.google.maps.LatLng(route.origin.lat, route.origin.lng),
        destination: new window.google.maps.LatLng(route.destination.lat, route.destination.lng),
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        avoidTolls: true, // Important for dangerous goods transport
        region: 'AU' // Australian routing
      }, (result: any, status: any) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
        } else {
          console.warn(`Directions request failed: ${status}`);
        }
      });

      newDirections.push(directionsRenderer);
    });

    setDirections(newDirections);
  }, [map, routes]);

  // Traffic layer toggle
  useEffect(() => {
    if (!map || !window.google) return;

    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new window.google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(map);
    } else {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    }
  }, [map, showTraffic]);

  // Restricted zones overlay
  useEffect(() => {
    if (!map || !window.google || restrictedZones.length === 0) return;

    restrictedZones.forEach(zone => {
      const rectangle = new window.google.maps.Rectangle({
        bounds: zone.bounds,
        fillColor: '#ff0000',
        fillOpacity: 0.1,
        strokeColor: '#ff0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold text-red-600">${zone.title}</h3>
            <p class="text-sm">Restrictions:</p>
            <ul class="text-xs">
              ${zone.restrictions.map(r => `<li>• ${r}</li>`).join('')}
            </ul>
          </div>
        `
      });

      rectangle.addListener('click', (event: any) => {
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
      });
    });
  }, [map, restrictedZones]);

  const getMarkerIcon = (type?: string) => {
    const baseUrl = 'https://maps.google.com/mapfiles/ms/icons/';
    
    switch (type) {
      case 'vehicle':
        return {
          url: baseUrl + 'truck.png',
          scaledSize: new window.google.maps.Size(32, 32)
        };
      case 'shipment':
        return {
          url: baseUrl + 'blue-dot.png',
          scaledSize: new window.google.maps.Size(32, 32)
        };
      case 'destination':
        return {
          url: baseUrl + 'green-dot.png',
          scaledSize: new window.google.maps.Size(32, 32)
        };
      case 'warning':
        return {
          url: baseUrl + 'red-dot.png',
          scaledSize: new window.google.maps.Size(32, 32)
        };
      default:
        return {
          url: baseUrl + 'blue-dot.png',
          scaledSize: new window.google.maps.Size(32, 32)
        };
    }
  };

  const createInfoWindowContent = (markerData: any) => {
    return `
      <div class="p-3 max-w-xs">
        <h3 class="font-semibold text-gray-900 mb-2">${markerData.title}</h3>
        ${markerData.info?.address ? `<p class="text-sm text-gray-600 mb-1">${markerData.info.address}</p>` : ''}
        ${markerData.info?.status ? `<p class="text-sm"><span class="font-medium">Status:</span> ${markerData.info.status}</p>` : ''}
        ${markerData.info?.dangerousGoods ? `<p class="text-sm text-orange-600"><span class="font-medium">⚠️ DG Class:</span> ${markerData.info.dangerousGoods}</p>` : ''}
      </div>
    `;
  };

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Google Maps Error: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isLoaded) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading Google Maps...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div 
          ref={mapRef} 
          style={{ height, width: '100%' }}
          className="rounded-lg"
        />
      </CardContent>
    </Card>
  );
};

export default GoogleMapComponent;