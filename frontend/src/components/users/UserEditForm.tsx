"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpdateUserRequest, useUpdateUser, User } from "@/hooks/useUsers";

interface UserEditFormProps {
  user: User;
  onClose: () => void;
  onSuccess?: () => void;
}

const USER_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "DISPATCHER", label: "Dispatcher" },
  { value: "COMPLIANCE_OFFICER", label: "Compliance Officer" },
  { value: "DRIVER", label: "Driver" },
  { value: "CUSTOMER", label: "Customer" },
];

export function UserEditForm({ user, onClose, onSuccess }: UserEditFormProps) {
  const updateUserMutation = useUpdateUser();

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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              {...register("role", { required: "Role is required" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {USER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
            )}
          </div>

          {/* Status Checkboxes */}
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
          </div>

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
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#153F9F] hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
