'use client'

import React, { useState } from 'react'
import { 
  CubeIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeIcon,
  Cog6ToothIcon,
  ScaleIcon,
  TruckIcon,
  MapPinIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../components/DashboardLayout'

// Pallet space configuration matching your Figma design
const VEHICLE_LAYOUT = {
  bottomLevel: {
    modules: [
      { id: 'B1', type: 'module', weight: 600, position: { row: 0, col: 0 }, cargo: null },
      { id: 'B2', type: 'module', weight: 600, position: { row: 0, col: 1 }, cargo: null },
      { id: 'B3', type: 'module', weight: 600, position: { row: 0, col: 2 }, cargo: null },
      { id: 'B4', type: 'module', weight: 600, position: { row: 0, col: 3 }, cargo: null },
      { id: 'B5', type: 'pallet', weight: 600, position: { row: 0, col: 4 }, cargo: null },
      { id: 'B6', type: 'pallet', weight: 600, position: { row: 1, col: 0 }, cargo: null },
      { id: 'B7', type: 'pallet', weight: 600, position: { row: 1, col: 1 }, cargo: { type: 'dg', unNumber: 'UN1203', class: 'Class 3' } },
      { id: 'B8', type: 'pallet', weight: 600, position: { row: 1, col: 2 }, cargo: null },
      { id: 'B9', type: 'pallet', weight: 600, position: { row: 1, col: 3 }, cargo: null },
      { id: 'B10', type: 'pallet', weight: 600, position: { row: 1, col: 4 }, cargo: null }
    ]
  },
  topLevel: {
    pallets: [
      { id: 'T1', type: 'pallet', weight: 300, position: { row: 0, col: 0 }, cargo: null },
      { id: 'T2', type: 'pallet', weight: 300, position: { row: 0, col: 1 }, cargo: null },
      { id: 'T3', type: 'pallet', weight: 300, position: { row: 0, col: 2 }, cargo: { type: 'dg', unNumber: 'UN1072', class: 'Class 2' } },
      { id: 'T4', type: 'pallet', weight: 300, position: { row: 0, col: 3 }, cargo: null },
      { id: 'T5', type: 'pallet', weight: 300, position: { row: 1, col: 0 }, cargo: null },
      { id: 'T6', type: 'pallet', weight: 300, position: { row: 1, col: 1 }, cargo: null },
      { id: 'T7', type: 'pallet', weight: 300, position: { row: 1, col: 2 }, cargo: null },
      { id: 'T8', type: 'pallet', weight: 300, position: { row: 1, col: 3 }, cargo: null }
    ]
  }
}

export default function LoadPlanningPage() {
  const [currentLevel, setCurrentLevel] = useState<'bottomLevel' | 'topLevel'>('bottomLevel')
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null)
  const [showSpaceModal, setShowSpaceModal] = useState(false)
  const [vehicleLayout, setVehicleLayout] = useState(VEHICLE_LAYOUT)

  const [tripData] = useState({
    title: 'Hazelmere to Newman',
    client: 'Christian Jimenez',
    vehicle: {
      registration: '-',
      type: 'Heavy Rigid',
      year: 2004,
      vin: '3FAHP0HA2CR381193',
      fuelType: 'Diesel',
      grossWeight: '20,000L',
      emptyWeight: '20,000L',
      payloadCapacity: '20,000L',
      maxAxleWeights: '20,000L',
      shippingCapacity: 16
    },
    deckDetails: [
      { name: 'Gooseneck', palletSpace: 6, maxWeight: '4000 KG' },
      { name: 'Main Deck 1', palletSpace: 4, maxWeight: '4000 KG' },
      { name: 'Main Deck 2', palletSpace: 6, maxWeight: '6000 KG' },
      { name: 'Mezzanine 1', palletSpace: 4, maxWeight: '4000 KG' },
      { name: 'Mezzanine 2', palletSpace: 6, maxWeight: '6000 KG' }
    ]
  })

  const handleSpaceClick = (spaceId: string) => {
    setSelectedSpace(spaceId)
    setShowSpaceModal(true)
  }

  const getCurrentLevelData = () => {
    return currentLevel === 'bottomLevel' 
      ? vehicleLayout.bottomLevel.modules 
      : vehicleLayout.topLevel.pallets
  }

  const getSpaceStyle = (space: any) => {
    const baseStyle = "w-24 h-24 border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:shadow-md text-xs font-medium"
    
    if (space.cargo?.type === 'dg') {
      return `${baseStyle} bg-red-100 border-red-300 text-red-800`
    } else if (space.type === 'module') {
      return `${baseStyle} bg-[#153F9F] text-white border-[#153F9F]`
    } else {
      return `${baseStyle} bg-blue-100 border-blue-300 text-blue-800`
    }
  }

  const getDGIcon = (unNumber: string) => {
    // Return different DG symbols based on UN number
    if (unNumber === 'UN1203') return '🔥' // Flammable liquid
    if (unNumber === 'UN1072') return '⚠️' // Non-flammable gas  
    return '☢️' // Generic hazard
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm">
          <ChevronLeftIcon className="w-5 h-5 text-[#153F9F]" />
          <span className="text-gray-600">Trips /</span>
          <span className="font-semibold text-gray-900">{tripData.title}</span>
        </div>

        {/* Trip Header */}
        <div className="card">
          <div className="flex justify-between items-center p-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-poppins mb-2">
                {tripData.title}
              </h1>
              <div className="flex items-center text-gray-600">
                <span className="text-sm">👤 Client: {tripData.client}</span>
              </div>
            </div>
            <button className="btn-primary">
              Start trip
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button className="px-4 py-2 text-sm font-medium text-gray-600 rounded-md">Info</button>
          <button className="px-4 py-2 text-sm font-medium text-gray-600 rounded-md">Map</button>
          <button className="px-4 py-2 text-sm font-medium text-gray-600 rounded-md">Attached files</button>
          <button className="px-4 py-2 text-sm font-medium text-gray-600 rounded-md">Hazard Inspection</button>
          <button className="px-4 py-2 text-sm font-medium bg-[#153F9F] text-white rounded-md">Load plan</button>
          <button className="px-4 py-2 text-sm font-medium text-gray-600 rounded-md">Chat</button>
        </div>

        {/* Level Toggle */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button 
            onClick={() => setCurrentLevel('bottomLevel')}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              currentLevel === 'bottomLevel' 
                ? 'bg-[#77D1A6] text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Bottom level
          </button>
          <button 
            onClick={() => setCurrentLevel('topLevel')}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              currentLevel === 'topLevel' 
                ? 'bg-[#77D1A6] text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Top level
          </button>
        </div>

        {/* Main Load Planning Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vehicle Visualization */}
          <div className="lg:col-span-2 card">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <TruckIcon className="w-5 h-5 mr-2 text-[#153F9F]" />
                Vehicle Load Plan - {currentLevel === 'bottomLevel' ? 'Bottom Level' : 'Top Level'}
              </h3>
              
              {/* Truck Visual with Pallet Grid */}
              <div className="relative bg-gray-50 rounded-lg p-8 min-h-[400px]">
                {/* Truck Outline */}
                <div className="absolute inset-4 border-4 border-gray-300 rounded-lg bg-white/50">
                  {/* Truck Cab */}
                  <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 w-12 h-20 bg-gray-300 rounded-r-lg"></div>
                </div>
                
                {/* Pallet Grid */}
                <div className="relative z-10 flex justify-center items-center h-full">
                  <div className="grid grid-cols-5 gap-2 p-4">
                    {getCurrentLevelData().map((space) => (
                      <div
                        key={space.id}
                        onClick={() => handleSpaceClick(space.id)}
                        className={getSpaceStyle(space)}
                        style={{
                          gridColumn: `${space.position.col + 1}`,
                          gridRow: `${space.position.row + 1}`
                        }}
                      >
                        {/* DG Symbol */}
                        {space.cargo?.type === 'dg' && (
                          <div className="text-lg mb-1">
                            {getDGIcon(space.cargo.unNumber)}
                          </div>
                        )}
                        
                        {/* Space Type */}
                        <div className="text-center">
                          <div className="font-medium capitalize">{space.type}</div>
                          <div className="text-xs">{space.weight} KG</div>
                          {space.cargo?.unNumber && (
                            <div className="text-xs font-bold">{space.cargo.unNumber}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 flex space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-[#153F9F] rounded"></div>
                    <span>Module 600kg</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                    <span>Pallet 300kg</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                    <span>Dangerous Goods</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Specifications */}
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Details</h3>
              
              <div className="space-y-3 text-sm">
                {Object.entries(tripData.vehicle).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="font-medium text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Deck Details */}
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deck Configuration</h3>
            
            <div className="space-y-4">
              {tripData.deckDetails.map((deck, index) => (
                <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="font-semibold text-gray-900">{deck.name}</div>
                  </div>
                  <div className="flex space-x-8 text-sm text-gray-600">
                    <span>Pallet space: {deck.palletSpace}</span>
                    <span>Max weight: {deck.maxWeight}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Load Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="p-4">
              <div className="text-2xl font-bold text-[#153F9F]">16</div>
              <div className="text-sm text-gray-600">Total Spaces</div>
            </div>
          </div>
          <div className="card text-center">
            <div className="p-4">
              <div className="text-2xl font-bold text-green-600">12</div>
              <div className="text-sm text-gray-600">Occupied</div>
            </div>
          </div>
          <div className="card text-center">
            <div className="p-4">
              <div className="text-2xl font-bold text-yellow-600">2</div>
              <div className="text-sm text-gray-600">Dangerous Goods</div>
            </div>
          </div>
          <div className="card text-center">
            <div className="p-4">
              <div className="text-2xl font-bold text-purple-600">87%</div>
              <div className="text-sm text-gray-600">Utilization</div>
            </div>
          </div>
        </div>
      </div>

      {/* Space Details Modal (placeholder) */}
      {showSpaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Configure Pallet Space</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (KG)
                </label>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter weight"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Handling Unit
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option>Pallet</option>
                  <option>Module</option>
                  <option>Loose Cargo</option>
                </select>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-700">Dangerous Goods</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => setShowSpaceModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowSpaceModal(false)}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
} 