'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TruckIcon } from '@heroicons/react/24/outline'
import { vehicleEditSchema, VehicleEditFormValues, VehicleType, VehicleStatus, Vehicle } from '@/services/vehicles'
import { useUpdateVehicle } from '@/hooks/useVehicles'

interface VehicleEditFormProps {
  vehicle: Vehicle
  onSuccess?: () => void
  onCancel?: () => void
}

export default function VehicleEditForm({ vehicle, onSuccess, onCancel }: VehicleEditFormProps) {
  const updateVehicleMutation = useUpdateVehicle()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<VehicleEditFormValues>({
    resolver: zodResolver(vehicleEditSchema),
    defaultValues: {
      registration_number: vehicle.registration_number,
      vehicle_type: vehicle.vehicle_type,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      status: vehicle.status,
      payload_capacity: vehicle.payload_capacity,
      pallet_spaces: vehicle.pallet_spaces,
      is_dg_certified: vehicle.is_dg_certified,
      assigned_depot: vehicle.assigned_depot?.id || '',
      owning_company: vehicle.owning_company?.id || ''
    }
  })

  const onSubmit = async (data: VehicleEditFormValues) => {
    try {
      await updateVehicleMutation.mutateAsync({ id: vehicle.id, data })
      
      // Call success callback
      onSuccess?.()
    } catch (error: any) {
      // Handle API errors
      if (error?.details) {
        // Map backend validation errors to form fields
        Object.entries(error.details).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            setError(field as keyof VehicleEditFormValues, {
              type: 'server',
              message: messages[0]
            })
          }
        })
      } else {
        // General error
        setError('root', {
          type: 'server',
          message: error?.message || 'Failed to update vehicle. Please try again.'
        })
      }
    }
  }

  const vehicleTypeOptions: { value: VehicleType; label: string; description: string }[] = [
    {
      value: 'rigid-truck',
      label: 'Rigid Truck',
      description: 'Single unit truck with fixed cargo area'
    },
    {
      value: 'semi-trailer',
      label: 'Semi Trailer',
      description: 'Tractor-trailer combination'
    },
    {
      value: 'b-double',
      label: 'B-Double',
      description: 'Two trailers connected by a fifth wheel'
    },
    {
      value: 'road-train',
      label: 'Road Train',
      description: 'Multiple trailers connected in series'
    },
    {
      value: 'van',
      label: 'Van',
      description: 'Delivery van or light commercial vehicle'
    },
    {
      value: 'other',
      label: 'Other',
      description: 'Other vehicle type'
    }
  ]

  const statusOptions: { value: VehicleStatus; label: string; description: string }[] = [
    {
      value: 'available',
      label: 'Available',
      description: 'Ready for assignment'
    },
    {
      value: 'in-transit',
      label: 'In Transit',
      description: 'Currently on a delivery'
    },
    {
      value: 'loading',
      label: 'Loading',
      description: 'Being loaded or unloaded'
    },
    {
      value: 'maintenance',
      label: 'Maintenance',
      description: 'Under maintenance or repair'
    },
    {
      value: 'out-of-service',
      label: 'Out of Service',
      description: 'Not available for use'
    }
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* General error message */}
      {errors.root && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.root.message}</p>
        </div>
      )}

      {/* Registration Number and Vehicle Type Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="registration_number" className="block text-sm font-medium text-gray-700 mb-1">
            Registration Number *
          </label>
          <input
            {...register('registration_number')}
            type="text"
            id="registration_number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
            placeholder="Enter registration number"
          />
          {errors.registration_number && (
            <p className="mt-1 text-sm text-red-600">{errors.registration_number.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="vehicle_type" className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Type *
          </label>
          <select
            {...register('vehicle_type')}
            id="vehicle_type"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
          >
            {vehicleTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
          {errors.vehicle_type && (
            <p className="mt-1 text-sm text-red-600">{errors.vehicle_type.message}</p>
          )}
        </div>
      </div>

      {/* Make and Model Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">
            Make *
          </label>
          <input
            {...register('make')}
            type="text"
            id="make"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
            placeholder="Enter vehicle make"
          />
          {errors.make && (
            <p className="mt-1 text-sm text-red-600">{errors.make.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
            Model *
          </label>
          <input
            {...register('model')}
            type="text"
            id="model"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
            placeholder="Enter vehicle model"
          />
          {errors.model && (
            <p className="mt-1 text-sm text-red-600">{errors.model.message}</p>
          )}
        </div>
      </div>

      {/* Year and Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
            Year *
          </label>
          <input
            {...register('year', { valueAsNumber: true })}
            type="number"
            id="year"
            min="1900"
            max={new Date().getFullYear() + 1}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
            placeholder="Enter vehicle year"
          />
          {errors.year && (
            <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            {...register('status')}
            id="status"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>
      </div>

      {/* Capacity Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="payload_capacity" className="block text-sm font-medium text-gray-700 mb-1">
            Payload Capacity (kg) *
          </label>
          <input
            {...register('payload_capacity', { valueAsNumber: true })}
            type="number"
            id="payload_capacity"
            min="0"
            max="100000"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
            placeholder="Enter payload capacity"
          />
          {errors.payload_capacity && (
            <p className="mt-1 text-sm text-red-600">{errors.payload_capacity.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="pallet_spaces" className="block text-sm font-medium text-gray-700 mb-1">
            Pallet Spaces *
          </label>
          <input
            {...register('pallet_spaces', { valueAsNumber: true })}
            type="number"
            id="pallet_spaces"
            min="0"
            max="100"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
            placeholder="Enter number of pallet spaces"
          />
          {errors.pallet_spaces && (
            <p className="mt-1 text-sm text-red-600">{errors.pallet_spaces.message}</p>
          )}
        </div>
      </div>

      {/* Dangerous Goods Certification */}
      <div>
        <div className="flex items-center">
          <input
            {...register('is_dg_certified')}
            type="checkbox"
            id="is_dg_certified"
            className="h-4 w-4 text-[#153F9F] focus:ring-[#153F9F] border-gray-300 rounded"
          />
          <label htmlFor="is_dg_certified" className="ml-2 block text-sm text-gray-700">
            Dangerous Goods Certified
          </label>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Check if this vehicle is certified to transport dangerous goods
        </p>
      </div>

      {/* Optional Fields */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Optional Information</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="assigned_depot" className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Depot
            </label>
            <input
              {...register('assigned_depot')}
              type="text"
              id="assigned_depot"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
              placeholder="Enter depot ID (optional)"
            />
            {errors.assigned_depot && (
              <p className="mt-1 text-sm text-red-600">{errors.assigned_depot.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="owning_company" className="block text-sm font-medium text-gray-700 mb-1">
              Owning Company
            </label>
            <input
              {...register('owning_company')}
              type="text"
              id="owning_company"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
              placeholder="Enter company ID (optional)"
            />
            {errors.owning_company && (
              <p className="mt-1 text-sm text-red-600">{errors.owning_company.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#153F9F]"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#153F9F] border border-transparent rounded-md hover:bg-[#122e7a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#153F9F] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Updating Vehicle...
            </>
          ) : (
            <>
              <TruckIcon className="w-4 h-4 mr-2" />
              Update Vehicle
            </>
          )}
        </button>
      </div>
    </form>
  )
} 