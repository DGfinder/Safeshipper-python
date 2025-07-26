"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { UpdateUserRequest, useUpdateUser, User } from "@/shared/hooks/useUsers";
import { usePermissions } from "@/contexts/PermissionContext";

interface UserEditFormProps {
  user: User;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserEditForm({ user, onClose, onSuccess }: UserEditFormProps) {
  const { can } = usePermissions();
  const updateUserMutation = useUpdateUser();

  // Early access check - if user can't even view users, show access denied
  if (!can('users.view')) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to view user details.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get available role options based on current user's permissions
  const getRoleOptions = () => {
    const options = [
      { value: "DRIVER", label: "Driver", description: "Basic driver access" },
      { value: "COMPLIANCE_OFFICER", label: "Compliance Officer", description: "Compliance oversight" },
      { value: "CUSTOMER", label: "Customer", description: "Customer portal access" },
    ];

    // Add operator role if user can assign it
    if (can('users.edit.role')) {
      options.push({ value: "DISPATCHER", label: "Dispatcher", description: "Operational control" });
    }

    // Add manager role if user has manager assignment permission
    if (can('users.assign.manager')) {
      options.push({ value: "MANAGER", label: "Manager", description: "Management access" });
    }

    // Add admin role if user has admin assignment permission  
    if (can('users.assign.admin')) {
      options.push({ value: "ADMIN", label: "Admin", description: "Full system access" });
    }

    return options;
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<UpdateUserRequest>();

  // Reset form with user data when user prop changes
  useEffect(() => {
    reset({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      is_staff: user.is_staff,
    });
  }, [user, reset]);

  const onSubmit = async (data: UpdateUserRequest) => {
    // Early permission check for editing users
    if (!can('users.edit')) {
      toast.error("You don't have permission to edit users");
      return;
    }

    try {
      await updateUserMutation.mutateAsync({ id: user.id, data });
      toast.success("User updated successfully!");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Update user error:", error);

      // Handle validation errors from the backend
      if (error.message.includes("email")) {
        setError("email", { message: "A user with this email already exists" });
      } else {
        toast.error(error.message || "Failed to update user");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input
              value={user.username}
              disabled
              className="bg-gray-100 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Username cannot be changed
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
              placeholder="Enter email address"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <Input {...register("first_name")} placeholder="Enter first name" />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <Input {...register("last_name")} placeholder="Enter last name" />
          </div>

          {/* Role */}
          {can('users.edit.role') ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                {...register("role", { required: "Role is required" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {getRoleOptions().map((role) => (
                  <option key={role.value} value={role.value} title={role.description}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <Input
                value={user.role_display || user.role}
                disabled
                className="bg-gray-100 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                You don't have permission to change user roles
              </p>
            </div>
          )}

          {/* Status Checkboxes */}
          {can('users.edit.status') && (
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register("is_active")}
                  id="is_active"
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm text-gray-600">
                  Active user
                </label>
              </div>
              {can('users.assign.admin') && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register("is_staff")}
                    id="is_staff"
                    className="mr-2"
                  />
                  <label htmlFor="is_staff" className="text-sm text-gray-600">
                    Staff user (admin privileges)
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Password Change Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> To change this user&apos;s password, please
              contact a system administrator.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              {can('users.edit') ? 'Cancel' : 'Close'}
            </Button>
            {can('users.edit') && (
              <Button
                type="submit"
                className="flex-1 bg-[#153F9F] hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update User"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
