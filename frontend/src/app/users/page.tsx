'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';
import UserCreateForm from '@/components/users/UserCreateForm';
import UserEditForm from '@/components/users/UserEditForm';
import DeleteConfirmation from '@/components/ui/DeleteConfirmation';

// Placeholder for API service functions
const usersService = {
  getUsers: async () => {
    // Simulate API call
    return new Promise((resolve) =>
      setTimeout(() =>
        resolve([
          { id: '1', username: 'john.doe', email: 'john@example.com', role: 'driver', is_active: true },
          { id: '2', username: 'jane.smith', email: 'jane@example.com', role: 'dispatcher', is_active: true },
          { id: '3', username: 'admin.user', email: 'admin@example.com', role: 'admin', is_active: true },
        ]),
      1000)
    );
  },
  createUser: async (userData: any) => {
    // Simulate API call
    return new Promise((resolve) => setTimeout(() => resolve({ id: Date.now().toString(), ...userData }), 500));
  },
  updateUser: async (userId: string, userData: any) => {
    // Simulate API call
    return new Promise((resolve) => setTimeout(() => resolve({ id: userId, ...userData }), 500));
  },
  deleteUser: async (userId: string) => {
    // Simulate API call
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));
  },
  deleteUsers: async (userIds: string[]) => {
    // Simulate API call for bulk delete
    return new Promise((resolve) => setTimeout(() => resolve({ success: true, deletedCount: userIds.length }), 500));
  },
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users, isPending, error } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.getUsers,
  });

  const createUserMutation = useMutation({
    mutationFn: usersService.createUser,
    onSuccess: (newUser: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User "${newUser.username}" created successfully!`);
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Failed to create user: ${err.message}`);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: any }) => usersService.updateUser(userId, userData),
    onSuccess: (updatedUser: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User "${updatedUser.username}" updated successfully!`);
      setEditingUser(null);
    },
    onError: (err: any) => {
      toast.error(`Failed to update user: ${err.message}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: usersService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully!');
      setDeletingUser(null);
    },
    onError: (err: any) => {
      toast.error(`Failed to delete user: ${err.message}`);
    },
  });

  const bulkDeleteUsersMutation = useMutation({
    mutationFn: usersService.deleteUsers,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`${data.deletedCount} users deleted successfully!`);
      setSelectedUsers([]);
    },
    onError: (err: any) => {
      toast.error(`Failed to delete users: ${err.message}`);
    },
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filters, setFilters] = useState({ role: '', search: '' });

  const handleCheckboxChange = (userId: string) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    );
  };

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers((users as any[])?.map((user) => user.id) || []);
    } else {
      setSelectedUsers([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedUsers.length > 0) {
      bulkDeleteUsersMutation.mutate(selectedUsers);
    }
  };

  const handleClearFilters = () => {
    setFilters({ role: '', search: '' });
    // Optionally, re-fetch data if filters are applied on the backend
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const filteredUsers = (users as any[])?.filter((user: any) => {
    const matchesRole = filters.role ? user.role === filters.role : true;
    const matchesSearch = filters.search ? 
      user.username.includes(filters.search) || 
      user.email.includes(filters.search) : true;
    return matchesRole && matchesSearch;
  });

  if (isPending) return <div>Loading users...</div>;
  if (error) return <div>Error loading users: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>

      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add User
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedUsers.length === 0 || bulkDeleteUsersMutation.isPending}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-5 w-5 mr-2" />
            Delete Selected ({selectedUsers.length})
          </button>
        </div>
        <div className="flex space-x-2">
          <select 
            value={filters.role} 
            onChange={(e) => setFilters({...filters, role: e.target.value})}
            className="p-2 border rounded"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="dispatcher">Dispatcher</option>
            <option value="driver">Driver</option>
          </select>
          <input 
            type="text" 
            placeholder="Search users..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="p-2 border rounded"
          />
          <button
            onClick={handleClearFilters}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded flex items-center"
          >
            <XMarkIcon className="h-5 w-5 mr-2" />
            Clear Filters
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
            <tr>
              <th className="py-3 px-6 text-left">
                <input
                  type="checkbox"
                  onChange={handleSelectAllChange}
                  checked={selectedUsers.length === (users as any[])?.length && (users as any[])?.length > 0}
                />
              </th>
              <th className="py-3 px-6 text-left">Username</th>
              <th className="py-3 px-6 text-left">Email</th>
              <th className="py-3 px-6 text-left">Role</th>
              <th className="py-3 px-6 text-left">Status</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {filteredUsers?.map((user) => (
              <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleCheckboxChange(user.id)}
                  />
                </td>
                <td className="py-3 px-6 text-left">{user.username}</td>
                <td className="py-3 px-6 text-left">{user.email}</td>
                <td className="py-3 px-6 text-left">{user.role}</td>
                <td className="py-3 px-6 text-left">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.is_active ? 'bg-green-200 text-green-600' : 'bg-red-200 text-red-600'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-6 text-center">
                  <div className="flex item-center justify-center">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
                      title="Edit user"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => setDeletingUser(user)}
                      className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
                      title="Delete user"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New User">
                    <UserCreateForm onSubmit={createUserMutation.mutate} isLoading={createUserMutation.isPending} />
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
        {editingUser && (
          <UserEditForm
            user={editingUser}
            onSubmit={(userData) => updateUserMutation.mutate({ userId: editingUser.id, userData })}
            isLoading={updateUserMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingUser} onClose={() => setDeletingUser(null)} title="Confirm Deletion">
        {deletingUser && (
          <DeleteConfirmation
            title="Delete User"
            message={`Are you sure you want to delete user "${deletingUser.username}"? This action cannot be undone.`}
            onConfirm={() => deleteUserMutation.mutate(deletingUser.id)}
            onCancel={() => setDeletingUser(null)}
            isLoading={deleteUserMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
}
