'use client'

import React, { useState, useEffect } from 'react'
import { 
  TruckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  WrenchScrewdriverIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'
import { vehiclesApi, Vehicle, VehicleType, VehicleStatus } from '@/services/vehicles'

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<VehicleType | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<VehicleStatus | 'all'>('all')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch vehicles from API
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const params: any = {}
        if (searchTerm) params.search = searchTerm
        if (selectedType !== 'all') params.vehicle_type = selectedType
        if (selectedStatus !== 'all') params.status = selectedStatus
        
        const response = await vehiclesApi.getVehicles(params)
        setVehicles(response.data)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch vehicles')
        console.error('Error fetching vehicles:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchVehicles()
  }, [searchTerm, selectedType, selectedStatus])

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = `${vehicle.registration_number} ${vehicle.make} ${vehicle.model}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || vehicle.vehicle_type === selectedType
    const matchesStatus = selectedStatus === 'all' || vehicle.status === selectedStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const getTypeColor = (type: VehicleType) => {
    const colors = {
      'rigid-truck': 'bg-blue-100 text-blue-800',
      'semi-trailer': 'bg-purple-100 text-purple-800',
      'b-double': 'bg-green-100 text-green-800',
      'road-train': 'bg-orange-100 text-orange-800',
      'van': 'bg-gray-100 text-gray-800',
      'other': 'bg-gray-100 text-gray-600'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: VehicleStatus) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      'in-transit': 'bg-blue-100 text-blue-800',
      loading: 'bg-yellow-100 text-yellow-800',
      maintenance: 'bg-orange-100 text-orange-800',
      'out-of-service': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: VehicleStatus) => {
    switch (status) {
      case 'available': return '🟢'
      case 'in-transit': return '🔵'
      case 'loading': return '🟡'
      case 'maintenance': return '🟠'
      case 'out-of-service': return '🔴'
      default: return '⚪'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-poppins">
              Vehicle Management
            </h1>
            <p className="text-gray-600 font-poppins">
              Manage fleet vehicles, specifications, and maintenance
            </p>
          </div>
          <button className="btn-primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Vehicle
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                />
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as VehicleType | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="rigid-truck">Rigid Truck</option>
                <option value="semi-trailer">Semi Trailer</option>
                <option value="b-double">B-Double</option>
                <option value="road-train">Road Train</option>
                <option value="van">Van</option>
                <option value="other">Other</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as VehicleStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="in-transit">In Transit</option>
                <option value="loading">Loading</option>
                <option value="maintenance">Maintenance</option>
                <option value="out-of-service">Out of Service</option>
              </select>

              {/* Results Count */}
              <div className="flex items-center text-sm text-gray-600">
                <FunnelIcon className="w-4 h-4 mr-2" />
                {filteredVehicles.length} of {vehicles.length} vehicles
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="card">
            <div className="p-6">
              <div className="text-red-600 text-center">
                <p className="font-medium">Error loading vehicles</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full p-6 text-center">
              <div className="text-gray-600">Loading vehicles...</div>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="col-span-full p-6 text-center text-gray-500">
              No vehicles found
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} className="card hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <TruckIcon className="w-8 h-8 text-[#153F9F]" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {vehicle.registration_number}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Status and Type */}
                  <div className="flex items-center space-x-2 mb-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vehicle.status)}`}>
                      <span className="mr-1">{getStatusIcon(vehicle.status)}</span>
                      {vehicle.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(vehicle.vehicle_type)}`}>
                      {vehicle.vehicle_type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {vehicle.is_dg_certified && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        DG Certified
                      </span>
                    )}
                  </div>

                  {/* Specifications */}
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-600">Payload:</span>
                        <span className="ml-1 font-medium">{(vehicle.payload_capacity / 1000).toFixed(1)}t</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Pallet Spaces:</span>
                        <span className="ml-1 font-medium">{vehicle.pallet_spaces}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  {vehicle.current_location && (
                    <div className="mt-4 flex items-center text-sm text-gray-600">
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      <span>
                        {vehicle.current_location.latitude.toFixed(4)}, {vehicle.current_location.longitude.toFixed(4)}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex space-x-2">
                    <button className="flex-1 btn-secondary text-sm">
                      <EyeIcon className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button className="flex-1 btn-secondary text-sm">
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button className="btn-secondary text-sm">
                      <WrenchScrewdriverIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="card text-center">
            <div className="p-6">
              <TruckIcon className="w-8 h-8 text-[#153F9F] mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{vehicles.length}</div>
              <div className="text-sm text-gray-600">Total Vehicles</div>
            </div>
          </div>
          <div className="card text-center">
            <div className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {vehicles.filter(v => v.status === 'available').length}
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
          </div>
          <div className="card text-center">
            <div className="p-6">
              <div className="text-2xl font-bold text-blue-600">
                {vehicles.filter(v => v.status === 'in-transit').length}
              </div>
              <div className="text-sm text-gray-600">In Transit</div>
            </div>
          </div>
          <div className="card text-center">
            <div className="p-6">
              <div className="text-2xl font-bold text-orange-600">
                {vehicles.filter(v => v.status === 'maintenance').length}
              </div>
              <div className="text-sm text-gray-600">Maintenance</div>
            </div>
          </div>
          <div className="card text-center">
            <div className="p-6">
              <div className="text-2xl font-bold text-purple-600">
                {vehicles.filter(v => v.is_dg_certified).length}
              </div>
              <div className="text-sm text-gray-600">DG Certified</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 