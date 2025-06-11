'use client'

import React, { useState } from 'react'
import { 
  UserIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

// Simplified types for now
type UserRole = 'admin' | 'manager' | 'dispatcher' | 'driver' | 'operator' | 'viewer'
type UserStatus = 'active' | 'inactive' | 'suspended'

interface SimpleUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  status: UserStatus
  phone?: string
  createdAt: Date
  lastLogin?: Date
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | 'all'>('all')

  // Mock user data
  const [users] = useState<SimpleUser[]>([
    {
      id: '1',
      email: 'admin@safeshipper.com',
      firstName: 'John',
      lastName: 'Anderson',
      role: 'admin',
      status: 'active',
      phone: '+61 400 123 456',
      createdAt: new Date('2024-01-15'),
      lastLogin: new Date('2024-01-20')
    },
    {
      id: '2',
      email: 'dispatch@safeshipper.com',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      role: 'dispatcher',
      status: 'active',
      phone: '+61 400 234 567',
      createdAt: new Date('2024-01-16'),
      lastLogin: new Date('2024-01-20')
    },
    {
      id: '3',
      email: 'driver1@safeshipper.com',
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'driver',
      status: 'active',
      phone: '+61 400 345 678',
      createdAt: new Date('2024-01-17'),
      lastLogin: new Date('2024-01-19')
    },
    {
      id: '4',
      email: 'manager@safeshipper.com',
      firstName: 'Emma',
      lastName: 'Wilson',
      role: 'manager',
      status: 'active',
      phone: '+61 400 456 789',
      createdAt: new Date('2024-01-18'),
      lastLogin: new Date('2024-01-20')
    }
  ])

  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleColor = (role: UserRole) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      dispatcher: 'bg-green-100 text-green-800',
      driver: 'bg-yellow-100 text-yellow-800',
      operator: 'bg-gray-100 text-gray-800',
      viewer: 'bg-gray-100 text-gray-600'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: UserStatus) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-poppins">
              User Management
            </h1>
            <p className="text-gray-600 font-poppins">
              Manage users, roles, and permissions
            </p>
          </div>
          <button className="btn-primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add User
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
                />
              </div>

              {/* Role Filter */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="driver">Driver</option>
                <option value="operator">Operator</option>
                <option value="viewer">Viewer</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as UserStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#153F9F] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>

              {/* Results Count */}
              <div className="flex items-center text-sm text-gray-600">
                <FunnelIcon className="w-4 h-4 mr-2" />
                {filteredUsers.length} of {users.length} users
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-[#153F9F] rounded-full flex items-center justify-center text-white font-medium">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.phone && (
                            <div className="text-sm text-gray-500">{user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="text-gray-400 hover:text-gray-600">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-blue-600">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-red-600">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <EllipsisVerticalIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card text-center">
            <div className="p-6">
              <UserIcon className="w-8 h-8 text-[#153F9F] mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
          </div>
          <div className="card text-center">
            <div className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
          </div>
          <div className="card text-center">
            <div className="p-6">
              <div className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'driver').length}
              </div>
              <div className="text-sm text-gray-600">Drivers</div>
            </div>
          </div>
          <div className="card text-center">
            <div className="p-6">
              <div className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.role === 'admin').length}
              </div>
              <div className="text-sm text-gray-600">Admins</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 