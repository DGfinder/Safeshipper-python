'use client'

import DashboardLayout from '@/components/DashboardLayout'

export default function UsersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage system users and permissions</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Management</h3>
          <p className="text-gray-600">User management features coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  )
} 