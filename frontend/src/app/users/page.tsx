'use client'

import React, { useState, useMemo } from 'react'
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
import Modal from '@/components/ui/Modal'
import UserCreateForm from '@/components/users/UserCreateForm'
import UserEditForm from '@/components/users/UserEditForm'
import DeleteConfirmation from '@/components/ui/DeleteConfirmation'
import { User, UserRole, UserStatus } from '@/services/users'
import { useUsers, useDeleteUser } from '@/hooks/useUsers'

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | 'all'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  // Build query parameters based on filters
  const queryParams = useMemo(() => {
    const params: any = {}
    if (searchTerm) params.search = searchTerm
    if (selectedRole !== 'all') params.role = selectedRole
    if (selectedStatus !== 'all') params.is_active = selectedStatus === 'active'
    return params
  }, [searchTerm, selectedRole, selectedStatus])

  // Fetch users using TanStack Query
  const { 
    data: users = [], 
    isLoading: loading, 
    isError, 
    error 
  } = useUsers(queryParams)

  // Delete user mutation
  const deleteUserMutation = useDeleteUser()

  // Handle delete confirmation
  const handleDeleteUser = async () => {
    if (!deletingUser) return
    
    try {
      await deleteUserMutation.mutateAsync({
        id: deletingUser.id,
        username: deletingUser.username
      })
      setDeletingUser(null)
    } catch (error) {
      // Error is handled by the mutation hook with toast
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    const matchesStatus = selectedStatus === 'all' || (selectedStatus === 'active' ? user.is_active : !user.is_active)
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
          <button 
            className="btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
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

        {/* Error State */}
        {isError && (
          <div className="card">
            <div className="p-6">
              <div className="text-red-600 text-center">
                <p className="font-medium">Error loading users</p>
                <p className="text-sm">{error?.message || 'Failed to fetch users'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="card">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="text-gray-600">Loading users...</div>
              </div>
            ) : (
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
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-[#153F9F] rounded-full flex items-center justify-center text-white font-medium">
                              {user.first_name[0]}{user.last_name[0]}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
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
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.is_active ? 'active' : 'inactive')}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              className="text-gray-400 hover:text-gray-600"
                              title="View user details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-gray-400 hover:text-blue-600"
                              onClick={() => setEditingUser(user)}
                              title="Edit user"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-gray-400 hover:text-red-600"
                              onClick={() => setDeletingUser(user)}
                              title="Delete user"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                            <button className="text-gray-400 hover:text-gray-600">
                              <EllipsisVerticalIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
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
                {users.filter(u => u.is_active).length}
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

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New User"
        size="lg"
      >
        <UserCreateForm
          onSuccess={() => setIsCreateModalOpen(false)}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit User: ${editingUser?.username}`}
        size="lg"
      >
        {editingUser && (
          <UserEditForm
            user={editingUser}
            onSuccess={() => setEditingUser(null)}
            onCancel={() => setEditingUser(null)}
          />
        )}
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        title="Delete User"
        size="sm"
      >
        {deletingUser && (
          <DeleteConfirmation
            title="Delete User?"
            message={`Are you sure you want to delete user "${deletingUser.username}"? This action cannot be undone.`}
            confirmText="Delete User"
            onConfirm={handleDeleteUser}
            onCancel={() => setDeletingUser(null)}
            isLoading={deleteUserMutation.isPending}
          />
        )}
      </Modal>
    </DashboardLayout>
  )
} 