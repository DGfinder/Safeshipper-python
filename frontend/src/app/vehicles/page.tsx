'use client'

import React, { useState, useMemo } from 'react'
import { 
  TruckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'
import Modal from '@/components/ui/Modal'
import DeleteConfirmation from '@/components/ui/DeleteConfirmation'
import VehicleCreateForm from '@/components/vehicles/VehicleCreateForm'
import VehicleEditForm from '@/components/vehicles/VehicleEditForm'
import { Vehicle, VehicleType, VehicleStatus } from '@/services/vehicles'
import { useVehicles, useDeleteVehicle } from '@/hooks/useVehicles'

type ModalType = 'create' | 'edit' | 'delete' | null

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<VehicleType | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<VehicleStatus | 'all'>('all')
  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)

  // Hooks
  const deleteVehicleMutation = useDeleteVehicle()

  // Build query parameters based on filters
  const queryParams = useMemo(() => {
    const params: any = {}
    if (searchTerm) params.search = searchTerm
    if (selectedType !== 'all') params.vehicle_type = selectedType
    if (selectedStatus !== 'all') params.status = selectedStatus
    return params
  }, [searchTerm, selectedType, selectedStatus])

  // Fetch vehicles using TanStack Query
  const { 
    data: vehicles = [], 
    isLoading: loading, 
    isError, 
    error 
  } = useVehicles(queryParams)

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

  // Modal handlers
  const openCreateModal = () => {
    setSelectedVehicle(null)
    setModalType('create')
  }

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setModalType('edit')
  }

  const openDeleteModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setModalType('delete')
  }

  const closeModal = () => {
    setModalType(null)
    setSelectedVehicle(null)
  }

  const handleDeleteConfirm = async () => {
    if (selectedVehicle) {
      await deleteVehicleMutation.mutateAsync({
        id: selectedVehicle.id,
        registration_number: selectedVehicle.registration_number
      })
      closeModal()
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
          <button onClick={openCreateModal} className="btn-primary">
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
        {isError && (
          <div className="card">
            <div className="p-6">
              <div className="text-red-600 text-center">
                <p className="font-medium">Error loading vehicles</p>
                <p className="text-sm">{error?.message || 'Failed to fetch vehicles'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Vehicles Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specifications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DG Certified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Loading vehicles...
                    </td>
                  </tr>
                ) : filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No vehicles found
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TruckIcon className="w-6 h-6 text-[#153F9F] mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {vehicle.registration_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(vehicle.vehicle_type)}`}>
                          {vehicle.vehicle_type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vehicle.status)}`}>
                          <span className="mr-1">{getStatusIcon(vehicle.status)}</span>
                          {vehicle.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{(vehicle.payload_capacity / 1000).toFixed(1)}t payload</div>
                        <div className="text-gray-500">{vehicle.pallet_spaces} pallet spaces</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {vehicle.is_dg_certified ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(vehicle)}
                            className="text-[#153F9F] hover:text-[#122e7a] transition-colors"
                            title="Edit vehicle"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(vehicle)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete vehicle"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

      {/* Modals */}
      <Modal
        isOpen={modalType === 'create'}
        onClose={closeModal}
        title="Add New Vehicle"
        size="lg"
      >
        <VehicleCreateForm 
          onSuccess={closeModal}
          onCancel={closeModal}
        />
      </Modal>

      <Modal
        isOpen={modalType === 'edit'}
        onClose={closeModal}
        title="Edit Vehicle"
        size="lg"
      >
        {selectedVehicle && (
          <VehicleEditForm 
            vehicle={selectedVehicle}
            onSuccess={closeModal}
            onCancel={closeModal}
          />
        )}
      </Modal>

      <Modal
        isOpen={modalType === 'delete'}
        onClose={closeModal}
        title="Delete Vehicle"
      >
        {selectedVehicle && (
          <DeleteConfirmation
            title="Delete Vehicle"
            message={`Are you sure you want to delete vehicle "${selectedVehicle.registration_number}"? This action cannot be undone.`}
            confirmText="Delete Vehicle"
            onConfirm={handleDeleteConfirm}
            onCancel={closeModal}
            isLoading={deleteVehicleMutation.isPending}
          />
        )}
      </Modal>
    </DashboardLayout>
  )
} 