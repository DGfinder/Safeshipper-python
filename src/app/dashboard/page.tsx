'use client'

import { useQuery } from 'react-query'
import DashboardLayout from '@/components/DashboardLayout'
import { vehicleService, shipmentService } from '@/services/api'
import { 
  TruckIcon, 
  CubeIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'
import DGHazardLabel from '@/components/DGHazardLabel'

export default function DashboardPage() {
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery(
    'vehicles',
    () => vehicleService.getAll()
  )

  const { data: shipments, isLoading: shipmentsLoading } = useQuery(
    'shipments',
    () => shipmentService.getAll()
  )

  const stats = [
    {
      name: 'Total Vehicles',
      value: vehicles?.data?.length || 0,
      icon: TruckIcon,
      color: 'bg-blue-500',
      loading: vehiclesLoading
    },
    {
      name: 'Active Shipments',
      value: shipments?.data?.filter((s: any) => s.status === 'IN_TRANSIT').length || 0,
      icon: CubeIcon,
      color: 'bg-green-500',
      loading: shipmentsLoading
    },
    {
      name: 'Pending Shipments',
      value: shipments?.data?.filter((s: any) => s.status === 'PENDING').length || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-yellow-500',
      loading: shipmentsLoading
    },
    {
      name: 'Completed Today',
      value: shipments?.data?.filter((s: any) => s.status === 'DELIVERED').length || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-600',
      loading: shipmentsLoading
    }
  ]

  const recentShipments = shipments?.data?.slice(0, 5) || []
  const recentVehicles = vehicles?.data?.slice(0, 5) || []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to SafeShipper dangerous goods management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.loading ? (
                      <div className="w-8 h-6 bg-gray-200 animate-pulse rounded"></div>
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Shipments */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Shipments</h3>
            {shipmentsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
                ))}
              </div>
            ) : recentShipments.length > 0 ? (
              <div className="space-y-3">
                {recentShipments.map((shipment: any) => (
                  <div key={shipment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {shipment.items?.some((item: any) => item.is_dangerous_good) && (
                        <DGHazardLabel 
                          unNumber="UN1203" 
                          hazardClass="3" 
                          size="sm" 
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {shipment.tracking_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          {shipment.reference_number || 'No reference'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      shipment.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      shipment.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                      shipment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {shipment.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No shipments found</p>
            )}
          </div>

          {/* Vehicle Status */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Status</h3>
            {vehiclesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
                ))}
              </div>
            ) : recentVehicles.length > 0 ? (
              <div className="space-y-3">
                {recentVehicles.map((vehicle: any) => (
                  <div key={vehicle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <TruckIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {vehicle.registration_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          {vehicle.make} {vehicle.model}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      vehicle.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                      vehicle.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                      vehicle.status === 'MAINTENANCE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No vehicles found</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <CubeIcon className="w-6 h-6 text-blue-500 mb-2" />
              <h4 className="font-medium text-gray-900">Create Shipment</h4>
              <p className="text-sm text-gray-600">Add a new dangerous goods shipment</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <TruckIcon className="w-6 h-6 text-green-500 mb-2" />
              <h4 className="font-medium text-gray-900">Add Vehicle</h4>
              <p className="text-sm text-gray-600">Register a new transport vehicle</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-500 mb-2" />
              <h4 className="font-medium text-gray-900">Safety Check</h4>
              <p className="text-sm text-gray-600">Run compliance verification</p>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 