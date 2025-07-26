"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CreateUserRequest, useCreateUser } from "@/shared/hooks/useUsers";
import { usePermissions } from "@/contexts/PermissionContext";

interface UserCreateFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}


export function UserCreateForm({ onClose, onSuccess }: UserCreateFormProps) {
  const { can } = usePermissions();
  const createUserMutation = useCreateUser();
  const [showPassword, setShowPassword] = useState(false);

  // Early access check - if user can't create users, show access denied
  if (!can('users.create')) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to create users.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic role configuration based on permissions
  const getRoleOptions = () => {
    // Base role configuration mapping frontend roles to backend roles
    const roleConfigs = [
      {
        value: "viewer",
        backendValue: "VIEWER", 
        label: "Viewer", 
        description: "Read-only access to basic features",
        requiredPermission: null // Everyone can assign viewer role
      },
      {
        value: "driver",
        backendValue: "DRIVER", 
        label: "Driver", 
        description: "Field operations and mobile access",
        requiredPermission: "users.edit.role"
      },
      {
        value: "operator", 
        backendValue: "OPERATOR",
        label: "Operator", 
        description: "Operational control and fleet management",
        requiredPermission: "users.edit.role"
      },
      {
        value: "customer",
        backendValue: "CUSTOMER", 
        label: "Customer", 
        description: "Customer portal access",
        requiredPermission: "users.edit.role"
      },
      {
        value: "manager",
        backendValue: "MANAGER", 
        label: "Manager", 
        description: "Management access and analytics",
        requiredPermission: "users.assign.manager"
      },
      {
        value: "admin",
        backendValue: "ADMIN", 
        label: "Admin", 
        description: "Full system access",
        requiredPermission: "users.assign.admin"
      }
    ];

    // Filter roles based on user permissions
    return roleConfigs.filter(role => {
      if (!role.requiredPermission) return true; // No permission required
      return can(role.requiredPermission as any);
    }).map(role => ({
      value: role.backendValue,
      label: role.label,
      description: role.description
    }));
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateUserRequest>({
    defaultValues: {
      role: "DRIVER",
      is_active: true,
      is_staff: false,
    },
  });

  const password = watch("password");

  const onSubmit = async (data: CreateUserRequest) => {
    // Early permission check for creating users
    if (!can('users.create')) {
      toast.error("You don't have permission to create users");
      return;
    }

    try {
      await createUserMutation.mutateAsync(data);
      toast.success("User created successfully!");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Create user error:", error);

      // Handle validation errors from the backend
      if (error.message.includes("email")) {
        setError("email", { message: "A user with this email already exists" });
      } else if (error.message.includes("username")) {
        setError("username", {
          message: "A user with this username already exists",
        });
      } else if (error.message.includes("password")) {
        setError("password", {
          message: "Password does not meet requirements",
        });
      } else {
        toast.error(error.message || "Failed to create user");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New User
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <Input
              {...register("username", {
                required: "Username is required",
                minLength: {
                  value: 3,
                  message: "Username must be at least 3 characters",
                },
              })}
              placeholder="Enter username"
              className={errors.username ? "border-red-500" : ""}
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">
                {errors.username.message}
              </p>
            )}
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

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <Input
              type={showPassword ? "text" : "password"}
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
              placeholder="Enter password"
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <Input
              type={showPassword ? "text" : "password"}
              {...register("password2", {
                required: "Please confirm your password",
                validate: (value) =>
                  value === password || "Passwords do not match",
              })}
              placeholder="Confirm password"
              className={errors.password2 ? "border-red-500" : ""}
            />
            {errors.password2 && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password2.message}
              </p>
            )}
          </div>

          {/* Show Password Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showPassword" className="text-sm text-gray-600">
              Show passwords
            </label>
          </div>

          {/* Status Checkboxes */}
          {can('users.edit.status') && (
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register("is_active")}
                  id="is_active"
                  defaultChecked
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
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
