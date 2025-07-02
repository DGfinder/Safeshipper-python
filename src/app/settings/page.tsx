'use client'

import DashboardLayout from '@/components/DashboardLayout'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure your SafeShipper system</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Configuration</h3>
          <p className="text-gray-600">Settings features coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  )
} 