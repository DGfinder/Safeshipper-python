'use client'

import React, { useEffect, useRef, useState } from 'react'
import Map, { 
  Marker, 
  Popup, 
  NavigationControl, 
  FullscreenControl,
  ScaleControl,
  GeolocateControl
} from 'react-map-gl'
import { io, Socket } from 'socket.io-client'
import { 
  TruckIcon, 
  SignalIcon,
  BatteryIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface VehicleLocation {
  vehicleId: string
  vehicleName: string
  location: {
    lat: number
    lng: number
    accuracy: number
    timestamp: string
  }
  telemetry: {
    speed: number
    heading: number
    battery: number
    signal: number
  }
  status: 'active' | 'idle' | 'offline'
  geofenceEvents?: Array<{
    type: string
    geofence: string
    timestamp: string
  }>
}

interface VehicleTrackingMapProps {
  initialVehicles?: VehicleLocation[]
  center?: [number, number]
  zoom?: number
  height?: string
}

export default function VehicleTrackingMap({
  initialVehicles = [],
  center = [-95.7129, 37.0902], // Geographic center of US
  zoom = 4,
  height = '500px'
}: VehicleTrackingMapProps) {
  const [vehicles, setVehicles] = useState<Map<string, VehicleLocation>>(
    new Map(initialVehicles.map(v => [v.vehicleId, v]))
  )
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null)
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom: zoom
  })
  
  const socketRef = useRef<Socket | null>(null)
  const mapRef = useRef<any>(null)

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_WS_URL) return

    const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
      transports: ['websocket'],
      autoConnect: true
    })

    socketRef.current = socket

    // Subscribe to vehicle location updates
    socket.on('location_update', (data: any) => {
      const vehicleUpdate: VehicleLocation = {
        vehicleId: data.vehicleId,
        vehicleName: data.vehicleName || `Vehicle ${data.vehicleId}`,
        location: data.location,
        telemetry: data.telemetry,
        status: determineVehicleStatus(data.telemetry, data.location.timestamp),
        geofenceEvents: data.geofenceEvents
      }

      setVehicles(prev => new Map(prev.set(data.vehicleId, vehicleUpdate)))
    })

    // Handle geofence alerts
    socket.on('geofence_alert', (data: any) => {
      console.log('Geofence alert:', data)
      // You can show toast notifications here
    })

    socket.on('connect', () => {
      console.log('Connected to tracking WebSocket')
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from tracking WebSocket')
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const determineVehicleStatus = (telemetry: any, timestamp: string): 'active' | 'idle' | 'offline' => {
    const lastUpdate = new Date(timestamp)
    const now = new Date()
    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)

    if (minutesSinceUpdate > 15) return 'offline'
    if (telemetry.speed < 5) return 'idle'
    return 'active'
  }

  const getVehicleIcon = (vehicle: VehicleLocation) => {
    const baseClasses = "w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2"
    
    switch (vehicle.status) {
      case 'active':
        return `${baseClasses} bg-success-500 border-success-600`
      case 'idle':
        return `${baseClasses} bg-warning-500 border-warning-600`
      case 'offline':
        return `${baseClasses} bg-neutral-500 border-neutral-600`
      default:
        return `${baseClasses} bg-neutral-500 border-neutral-600`
    }
  }

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    return date.toLocaleDateString()
  }

  const vehicleArray = Array.from(vehicles.values())

  return (
    <div className="relative" style={{ height }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-left" />
        <FullscreenControl position="top-left" />
        <ScaleControl position="bottom-left" />
        <GeolocateControl position="top-left" />

        {/* Vehicle Markers */}
        {vehicleArray.map((vehicle) => (
          <Marker
            key={vehicle.vehicleId}
            longitude={vehicle.location.lng}
            latitude={vehicle.location.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              setSelectedVehicle(vehicle)
            }}
          >
            <div 
              className={getVehicleIcon(vehicle)}
              style={{
                transform: `rotate(${vehicle.telemetry.heading}deg)`,
                cursor: 'pointer'
              }}
            >
              <TruckIcon className="w-4 h-4 text-white" />
            </div>
          </Marker>
        ))}

        {/* Vehicle Info Popup */}
        {selectedVehicle && (
          <Popup
            longitude={selectedVehicle.location.lng}
            latitude={selectedVehicle.location.lat}
            anchor="bottom"
            onClose={() => setSelectedVehicle(null)}
            className="vehicle-popup"
          >
            <div className="p-4 min-w-[280px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-neutral-900">
                  {selectedVehicle.vehicleName}
                </h3>
                <span className={`badge ${
                  selectedVehicle.status === 'active' ? 'badge-success' :
                  selectedVehicle.status === 'idle' ? 'badge-warning' : 
                  'bg-neutral-100 text-neutral-800'
                }`}>
                  {selectedVehicle.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Speed:</span>
                  <span className="font-medium">{Math.round(selectedVehicle.telemetry.speed)} mph</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 flex items-center">
                    <BatteryIcon className="w-4 h-4 mr-1" />
                    Battery:
                  </span>
                  <span className={`font-medium ${
                    selectedVehicle.telemetry.battery > 20 ? 'text-success-600' : 'text-warning-600'
                  }`}>
                    {selectedVehicle.telemetry.battery}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 flex items-center">
                    <SignalIcon className="w-4 h-4 mr-1" />
                    Signal:
                  </span>
                  <span className="font-medium">{selectedVehicle.telemetry.signal}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    Last Update:
                  </span>
                  <span className="font-medium">
                    {formatLastUpdate(selectedVehicle.location.timestamp)}
                  </span>
                </div>
              </div>

              {/* Geofence Events */}
              {selectedVehicle.geofenceEvents && selectedVehicle.geofenceEvents.length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-200">
                  <h4 className="text-sm font-medium text-neutral-900 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1 text-warning-500" />
                    Recent Events
                  </h4>
                  <div className="space-y-1">
                    {selectedVehicle.geofenceEvents.slice(0, 3).map((event, index) => (
                      <div key={index} className="text-xs text-neutral-600">
                        <span className="font-medium">{event.type}</span> {event.geofence}
                        <span className="text-neutral-500 ml-1">
                          ({formatLastUpdate(event.timestamp)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-neutral-200">
                <button
                  className="btn-primary text-xs py-1 px-2 w-full"
                  onClick={() => {
                    // Navigate to vehicle details
                    console.log('Navigate to vehicle details:', selectedVehicle.vehicleId)
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Vehicle Summary */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
        <h3 className="font-medium text-neutral-900 mb-3">Fleet Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center text-success-600">
              <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
              Active
            </span>
            <span className="font-medium">
              {vehicleArray.filter(v => v.status === 'active').length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center text-warning-600">
              <div className="w-2 h-2 bg-warning-500 rounded-full mr-2"></div>
              Idle
            </span>
            <span className="font-medium">
              {vehicleArray.filter(v => v.status === 'idle').length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center text-neutral-600">
              <div className="w-2 h-2 bg-neutral-500 rounded-full mr-2"></div>
              Offline
            </span>
            <span className="font-medium">
              {vehicleArray.filter(v => v.status === 'offline').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 