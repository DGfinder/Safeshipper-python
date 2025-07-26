"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/shared/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useUsers, User } from "@/shared/hooks/useUsers";
import { UserCreateForm } from "@/shared/components/users/UserCreateForm";
import { UserEditForm } from "@/shared/components/users/UserEditForm";
import { UserDeleteDialog } from "@/shared/components/users/UserDeleteDialog";
import { usePermissions } from "@/contexts/PermissionContext";

export default function UsersPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users, isLoading, error, refetch } = useUsers();
  const { can } = usePermissions();

  // Early access check - if user can't view users, show access denied
  if (!can('users.view')) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to view user management.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!users || !searchTerm) return users || [];

    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role_display?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [users, searchTerm]);

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "Never";

    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHours > 0)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffMinutes > 0)
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  const getUserInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username.slice(0, 2).toUpperCase();
  };

  const getUserDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.username;
  };

  const handleFormSuccess = () => {
    refetch();
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                User Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage system users, roles, and permissions
              </p>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load users: {error.message}
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage system users, roles, and permissions
            </p>
          </div>
          {can('users.create') && (
            <Button
              className="bg-[#153F9F] hover:bg-blue-700"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}
              {!isLoading && users && (
                <span className="text-sm text-gray-500">
                  {filteredUsers.length} of {users.length} users
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>A list of all users in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      User
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Last Login
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    // Loading skeletons
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-3 w-32" />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Skeleton className="h-6 w-16 rounded" />
                        </td>
                        <td className="py-3 px-4">
                          <Skeleton className="h-6 w-16 rounded" />
                        </td>
                        <td className="py-3 px-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-gray-500"
                      >
                        {searchTerm
                          ? "No users found matching your search."
                          : "No users found."}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-[#153F9F] rounded-full flex items-center justify-center text-white font-medium">
                              {getUserInitials(user)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {getUserDisplayName(user)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">{user.role_display}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={user.is_active ? "success" : "secondary"}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatLastLogin(user.last_login)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {can('users.edit') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                            {can('users.delete') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingUser(user)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        {showCreateForm && (
          <UserCreateForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={handleFormSuccess}
          />
        )}

        {editingUser && (
          <UserEditForm
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSuccess={handleFormSuccess}
          />
        )}

        {deletingUser && (
          <UserDeleteDialog
            user={deletingUser}
            onClose={() => setDeletingUser(null)}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
