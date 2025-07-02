'use client'

import React, { useState, useEffect } from 'react'
import { 
  MapPinIcon, 
  TruckIcon,
  SignalIcon,
  BatteryIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../components/DashboardLayout'

export default function TrackingPage() {
  const [vehicles, setVehicles] = useState([
    {
      id: 'V001',
      name: 'Freight Express 1',
      driver: 'John Smith',
      status: 'active',
      location: { lat: 29.7604, lng: -95.3698, city: 'Houston, TX' },
      telemetry: { speed: 65, battery: 89, signal: 95, lastUpdate: '30 seconds ago' },
      route: 'Houston → Dallas',
      cargo: 'DG Class 3 - UN1203',
      eta: '2:30 PM'
    },
    {
      id: 'V002', 
      name: 'Safe Cargo 247',
      driver: 'Maria Rodriguez',
      status: 'idle',
      location: { lat: 32.7767, lng: -96.7970, city: 'Dallas, TX' },
      telemetry: { speed: 0, battery: 92, signal: 88, lastUpdate: '1 minute ago' },
      route: 'Dallas → Austin',
      cargo: 'General Freight',
      eta: '4:15 PM'
    },
    {
      id: 'V003',
      name: 'Heavy Hauler 3',
      driver: 'David Wilson',
      status: 'maintenance',
      location: { lat: 30.2672, lng: -97.7431, city: 'Austin, TX' },
      telemetry: { speed: 0, battery: 15, signal: 72, lastUpdate: '15 minutes ago' },
      route: 'Maintenance Bay 3',
      cargo: 'None',
      eta: 'N/A'
    },
    {
      id: 'V004',
      name: 'Express Lane 89',
      driver: 'Sarah Johnson',
      status: 'active',
      location: { lat: 29.4241, lng: -98.4936, city: 'San Antonio, TX' },
      telemetry: { speed: 72, battery: 78, signal: 91, lastUpdate: '45 seconds ago' },
      route: 'San Antonio → Houston',
      cargo: 'DG Class 2 - UN1072',
      eta: '6:45 PM'
    }
  ])

  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || vehicle.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'idle': return 'text-yellow-600 bg-yellow-100'
      case 'maintenance': return 'text-blue-600 bg-blue-100'
      case 'offline': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="w-4 h-4" />
      case 'idle': return <ClockIcon className="w-4 h-4" />
      case 'maintenance': return <ExclamationTriangleIcon className="w-4 h-4" />
      case 'offline': return <ExclamationTriangleIcon className="w-4 h-4" />
      default: return <ClockIcon className="w-4 h-4" />
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-poppins">
              Live Vehicle Tracking
            </h1>
            <p className="text-gray-600 font-poppins">
              Real-time monitoring with Oyster 4G IoT devices
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="maintenance">Maintenance</option>
              <option value="offline">Offline</option>
            </select>
            
            <button className="btn-secondary">
              <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map View */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPinIcon className="w-5 h-5 mr-2 text-[#153F9F]" />
                    Live Fleet Map
                  </h3>
                  <button className="text-gray-400 hover:text-gray-600">
                    <ArrowsPointingOutIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Map Placeholder */}
              <div className="h-96 bg-gray-100 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPinIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-poppins mb-2">Interactive Map Integration</p>
                    <p className="text-sm text-gray-500">
                      Mapbox GL with real-time Oyster device positions
                    </p>
                    <div className="mt-4 flex justify-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Active ({vehicles.filter(v => v.status === 'active').length})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Idle ({vehicles.filter(v => v.status === 'idle').length})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Maintenance ({vehicles.filter(v => v.status === 'maintenance').length})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Legend */}
              <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                <div className="flex space-x-4">
                  <span>Last updated: 30 seconds ago</span>
                  <span>•</span>
                  <span>Auto-refresh: ON</span>
                </div>
                <button className="text-[#153F9F] hover:underline">
                  View Fullscreen
                </button>
              </div>
            </div>
          </div>

          {/* Vehicle List */}
          <div className="space-y-4">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">
                  Fleet Status ({filteredVehicles.length})
                </h3>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    isSelected={selectedVehicle?.id === vehicle.id}
                    onSelect={() => setSelectedVehicle(vehicle)}
                  />
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card text-center">
                <p className="text-2xl font-bold text-green-600">
                  {vehicles.filter(v => v.status === 'active').length}
                </p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {vehicles.filter(v => v.status === 'idle').length}
                </p>
                <p className="text-sm text-gray-600">Idle</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Vehicle Details */}
        {selectedVehicle && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TruckIcon className="w-5 h-5 mr-2 text-[#153F9F]" />
                Vehicle Details: {selectedVehicle.name}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <DetailCard
                title="Current Location"
                value={selectedVehicle.location.city}
                icon={MapPinIcon}
              />
              <DetailCard
                title="Driver"
                value={selectedVehicle.driver}
                icon={TruckIcon}
              />
              <DetailCard
                title="Route"
                value={selectedVehicle.route}
                icon={ClockIcon}
              />
              <DetailCard
                title="ETA"
                value={selectedVehicle.eta}
                icon={ClockIcon}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <TelemetryCard
                title="Speed"
                value={`${selectedVehicle.telemetry.speed} mph`}
                status={selectedVehicle.telemetry.speed > 0 ? 'active' : 'idle'}
              />
              <TelemetryCard
                title="Battery"
                value={`${selectedVehicle.telemetry.battery}%`}
                status={selectedVehicle.telemetry.battery > 30 ? 'good' : 'warning'}
              />
              <TelemetryCard
                title="Signal"
                value={`${selectedVehicle.telemetry.signal}%`}
                status={selectedVehicle.telemetry.signal > 70 ? 'good' : 'warning'}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

interface VehicleCardProps {
  vehicle: any
  isSelected: boolean
  onSelect: () => void
}

function VehicleCard({ vehicle, isSelected, onSelect }: VehicleCardProps) {
  return (
    <div
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected 
          ? 'border-[#153F9F] bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <TruckIcon className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-sm">{vehicle.name}</span>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getStatusColor(vehicle.status)}`}>
          {getStatusIcon(vehicle.status)}
          <span className="capitalize">{vehicle.status}</span>
        </span>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <p><MapPinIcon className="w-3 h-3 inline mr-1" />{vehicle.location.city}</p>
        <p><ClockIcon className="w-3 h-3 inline mr-1" />Last update: {vehicle.telemetry.lastUpdate}</p>
        {vehicle.status === 'active' && (
          <p><TruckIcon className="w-3 h-3 inline mr-1" />{vehicle.telemetry.speed} mph</p>
        )}
      </div>
    </div>
  )
}

interface DetailCardProps {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}

function DetailCard({ title, value, icon: Icon }: DetailCardProps) {
  return (
    <div className="flex items-center space-x-3">
      <div className="p-2 bg-gray-100 rounded-lg">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

interface TelemetryCardProps {
  title: string
  value: string
  status: string
}

function TelemetryCard({ title, value, status }: TelemetryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'active': return 'text-blue-600 bg-blue-100'
      case 'idle': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className={`text-2xl font-bold px-3 py-1 rounded-lg ${getStatusColor(status)}`}>
        {value}
      </p>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-100'
    case 'idle': return 'text-yellow-600 bg-yellow-100'
    case 'maintenance': return 'text-blue-600 bg-blue-100'
    case 'offline': return 'text-red-600 bg-red-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active': return <CheckCircleIcon className="w-4 h-4" />
    case 'idle': return <ClockIcon className="w-4 h-4" />
    case 'maintenance': return <ExclamationTriangleIcon className="w-4 h-4" />
    case 'offline': return <ExclamationTriangleIcon className="w-4 h-4" />
    default: return <ClockIcon className="w-4 h-4" />
  }
} 