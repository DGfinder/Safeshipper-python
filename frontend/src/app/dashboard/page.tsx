'use client'

import React, { useState, useEffect } from 'react'
import { 
  TruckIcon, 
  MapPinIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UsersIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '../components/DashboardLayout'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    activeVehicles: 247,
    deliveredToday: 1329,
    inTransit: 89,
    revenueToday: 47892,
    utilizationRate: 87.5,
    onTimeDelivery: 94.2,
    fuelEfficiency: 8.3,
    alerts: 12
  })

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'delivery',
      message: 'DG shipment UN1203 delivered safely to Houston Terminal',
      timestamp: '2 minutes ago',
      status: 'success'
    },
    {
      id: 2,
      type: 'alert',
      message: 'Vehicle #247 delayed - Expected delay: 45 minutes',
      timestamp: '5 minutes ago',
      status: 'warning'
    },
    {
      id: 3,
      type: 'booking',
      message: 'New capacity booking: LA → SF | 2.5 tons available',
      timestamp: '12 minutes ago',
      status: 'info'
    },
    {
      id: 4,
      type: 'compliance',
      message: 'Weekly DG compliance audit completed - 100% compliant',
      timestamp: '1 hour ago',
      status: 'success'
    }
  ])

  const [fleetStatus, setFleetStatus] = useState({
    active: 198,
    idle: 34,
    maintenance: 12,
    offline: 3
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-poppins">
              Dashboard Overview
            </h1>
            <p className="text-gray-600 font-poppins">
              Welcome back! Here's what's happening with your fleet today.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="btn-secondary">
              <Cog6ToothIcon className="w-4 h-4 mr-2" />
              Settings
            </button>
            <div className="relative">
              <button className="p-2 text-gray-400 hover:text-gray-600 relative">
                <BellIcon className="w-6 h-6" />
                {metrics.alerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {metrics.alerts}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Active Vehicles"
            value={metrics.activeVehicles.toString()}
            icon={TruckIcon}
            trend={{ value: 5.2, isPositive: true }}
            color="blue"
          />
          <MetricCard
            title="Delivered Today"
            value={metrics.deliveredToday.toLocaleString()}
            icon={CheckCircleIcon}
            trend={{ value: 12.1, isPositive: true }}
            color="green"
          />
          <MetricCard
            title="In Transit"
            value={metrics.inTransit.toString()}
            icon={ClockIcon}
            trend={{ value: 2.3, isPositive: false }}
            color="yellow"
          />
          <MetricCard
            title="Revenue Today"
            value={`$${metrics.revenueToday.toLocaleString()}`}
            icon={CurrencyDollarIcon}
            trend={{ value: 8.7, isPositive: true }}
            color="purple"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <PerformanceCard
            title="Fleet Utilization"
            value={`${metrics.utilizationRate}%`}
            target={90}
            current={metrics.utilizationRate}
            color="blue"
          />
          <PerformanceCard
            title="On-Time Delivery"
            value={`${metrics.onTimeDelivery}%`}
            target={95}
            current={metrics.onTimeDelivery}
            color="green"
          />
          <PerformanceCard
            title="Fuel Efficiency"
            value={`${metrics.fuelEfficiency} MPG`}
            target={9.0}
            current={metrics.fuelEfficiency}
            color="yellow"
          />
          <PerformanceCard
            title="Active Alerts"
            value={metrics.alerts.toString()}
            target={5}
            current={metrics.alerts}
            color="red"
            isInverse={true}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fleet Status */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MapPinIcon className="w-5 h-5 mr-2 text-[#153F9F]" />
                  Fleet Status Overview
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <FleetStatusCard
                  label="Active"
                  count={fleetStatus.active}
                  color="green"
                  percentage={(fleetStatus.active / 247) * 100}
                />
                <FleetStatusCard
                  label="Idle"
                  count={fleetStatus.idle}
                  color="yellow"
                  percentage={(fleetStatus.idle / 247) * 100}
                />
                <FleetStatusCard
                  label="Maintenance"
                  count={fleetStatus.maintenance}
                  color="blue"
                  percentage={(fleetStatus.maintenance / 247) * 100}
                />
                <FleetStatusCard
                  label="Offline"
                  count={fleetStatus.offline}
                  color="red"
                  percentage={(fleetStatus.offline / 247) * 100}
                />
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button className="btn-primary text-sm py-2">
                  <TruckIcon className="w-4 h-4 mr-2" />
                  View Live Map
                </button>
                <button className="btn-secondary text-sm py-2">
                  <ChartBarIcon className="w-4 h-4 mr-2" />
                  Load Planning
                </button>
                <button className="btn-secondary text-sm py-2">
                  <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                  View Alerts
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="text-[#153F9F] text-sm font-medium hover:underline">
                View all activity →
              </button>
            </div>
          </div>
        </div>

        {/* Route Performance Chart Placeholder */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2 text-[#153F9F]" />
              Route Performance Analytics
            </h3>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-poppins">Route analytics chart will be integrated here</p>
              <p className="text-sm text-gray-500 mt-2">
                Real-time performance metrics and optimization insights
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// Metric Card Component
interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: { value: number; isPositive: boolean }
  color: 'blue' | 'green' | 'yellow' | 'purple'
}

function MetricCard({ title, value, icon: Icon, trend, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600'
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <ArrowUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownIcon className="w-4 h-4 mr-1" />
              )}
              {trend.value}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

// Performance Card Component
interface PerformanceCardProps {
  title: string
  value: string
  target: number
  current: number
  color: 'blue' | 'green' | 'yellow' | 'red'
  isInverse?: boolean
}

function PerformanceCard({ title, value, target, current, color, isInverse = false }: PerformanceCardProps) {
  const percentage = isInverse ? 
    Math.max(0, (target - current) / target * 100) : 
    (current / target) * 100

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  }

  return (
    <div className="card">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
        <p className="text-xl font-bold text-gray-900 mb-3">{value}</p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${colorClasses[color]}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Target: {isInverse ? `≤${target}` : target}{typeof target === 'number' && target < 10 ? ' MPG' : target < 100 ? '%' : ''}
        </p>
      </div>
    </div>
  )
}

// Fleet Status Card Component
interface FleetStatusCardProps {
  label: string
  count: number
  color: 'green' | 'yellow' | 'blue' | 'red'
  percentage: number
}

function FleetStatusCard({ label, count, color, percentage }: FleetStatusCardProps) {
  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500'
  }

  return (
    <div className="text-center">
      <div className={`w-3 h-3 ${colorClasses[color]} rounded-full mx-auto mb-2`}></div>
      <p className="text-2xl font-bold text-gray-900">{count}</p>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
    </div>
  )
}

// Activity Item Component
interface ActivityItemProps {
  activity: {
    id: number
    type: string
    message: string
    timestamp: string
    status: string
  }
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getIcon = () => {
    switch (activity.type) {
      case 'delivery':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case 'alert':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
      case 'booking':
        return <UsersIcon className="w-4 h-4 text-blue-500" />
      case 'compliance':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 font-medium">{activity.message}</p>
        <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
      </div>
    </div>
  )
} 