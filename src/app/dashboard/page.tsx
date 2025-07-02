'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { vehicleService, shipmentService } from '@/services/api'
import DGHazardLabel from '@/components/DGHazardLabel'

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vehiclesRes, shipmentsRes] = await Promise.all([
          vehicleService.getAll(),
          shipmentService.getAll()
        ])
        setVehicles(vehiclesRes.data || [])
        setShipments(shipmentsRes.data || [])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const stats = [
    {
      name: 'Total Vehicles',
      value: vehicles.length,
      color: '#3b82f6'
    },
    {
      name: 'Active Shipments',
      value: shipments.filter(s => s.status === 'IN_TRANSIT').length,
      color: '#10b981'
    },
    {
      name: 'DG Shipments',
      value: shipments.filter(s => 
        s.items?.some((item: any) => item.is_dangerous_good)
      ).length,
      color: '#f59e0b'
    },
    {
      name: 'Completed Today',
      value: shipments.filter(s => s.status === 'DELIVERED').length,
      color: '#8b5cf6'
    }
  ]

  if (isLoading) {
    return (
      <DashboardLayout>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '400px' 
        }}>
          <div style={{ color: '#6b7280' }}>Loading dashboard data...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            Dashboard
          </h1>
          <p style={{ color: '#6b7280' }}>
            Overview of your dangerous goods transportation operations
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {stats.map((stat) => (
            <div key={stat.name} style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: stat.color,
                  width: '3rem',
                  height: '3rem'
                }} />
                <div style={{ marginLeft: '1rem' }}>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#6b7280',
                    marginBottom: '0.25rem'
                  }}>
                    {stat.name}
                  </p>
                  <p style={{ 
                    fontSize: '1.875rem', 
                    fontWeight: 'bold', 
                    color: '#111827' 
                  }}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {/* Recent Vehicles */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#111827', 
              marginBottom: '1rem' 
            }}>
              Recent Vehicles
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {vehicles.slice(0, 5).map((vehicle: any) => (
                <div key={vehicle.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem'
                }}>
                  <div>
                    <p style={{ fontWeight: '500', color: '#111827' }}>
                      {vehicle.registration_number}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {vehicle.make} {vehicle.model}
                    </p>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    borderRadius: '9999px',
                    backgroundColor: vehicle.status === 'AVAILABLE' ? '#dcfce7' : '#fef3c7',
                    color: vehicle.status === 'AVAILABLE' ? '#166534' : '#92400e'
                  }}>
                    {vehicle.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Shipments */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#111827', 
              marginBottom: '1rem' 
            }}>
              Recent Shipments
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {shipments.slice(0, 5).map((shipment: any) => (
                <div key={shipment.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div>
                      <p style={{ fontWeight: '500', color: '#111827' }}>
                        {shipment.tracking_number}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {shipment.origin_location} → {shipment.destination_location}
                      </p>
                    </div>
                    {shipment.items?.some((item: any) => item.is_dangerous_good) && (
                      <DGHazardLabel 
                        hazardClass={shipment.items.find((item: any) => item.is_dangerous_good)?.dangerous_good_entry?.hazard_class || '3'}
                        unNumber={shipment.items.find((item: any) => item.is_dangerous_good)?.dangerous_good_entry?.un_number}
                        size="sm"
                      />
                    )}
                  </div>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    borderRadius: '9999px',
                    backgroundColor: shipment.status === 'DELIVERED' ? '#dcfce7' : 
                                   shipment.status === 'IN_TRANSIT' ? '#dbeafe' : '#f3f4f6',
                    color: shipment.status === 'DELIVERED' ? '#166534' :
                           shipment.status === 'IN_TRANSIT' ? '#1e40af' : '#374151'
                  }}>
                    {shipment.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 