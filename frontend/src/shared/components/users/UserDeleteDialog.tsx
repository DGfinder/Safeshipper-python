"use client";

import { toast } from "react-hot-toast";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useDeleteUser, User } from "@/shared/hooks/useUsers";
import { usePermissions } from "@/contexts/PermissionContext";

interface UserDeleteDialogProps {
  user: User;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserDeleteDialog({
  user,
  onClose,
  onSuccess,
}: UserDeleteDialogProps) {
  const { can } = usePermissions();
  const deleteUserMutation = useDeleteUser();

  // Early access check - if user can't delete users, show access denied
  if (!can('users.delete')) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to delete users.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    // Early permission check for deleting users
    if (!can('users.delete')) {
      toast.error("You don't have permission to delete users");
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(user.id);
      toast.success("User deleted successfully!");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Delete user error:", error);
      toast.error(error.message || "Failed to delete user");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Delete User</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete this user? This action cannot be
            undone.
          </p>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#153F9F] rounded-full flex items-center justify-center text-white font-medium">
                {user.first_name?.[0] || user.username[0].toUpperCase()}
                {user.last_name?.[0] || user.username[1]?.toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {user.first_name || user.last_name
                    ? `${user.first_name} ${user.last_name}`.trim()
                    : user.username}
                </div>
                <div className="text-sm text-gray-500">{user.email}</div>
                <div className="text-sm text-gray-500">{user.role_display}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={deleteUserMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            disabled={deleteUserMutation.isPending}
          >
            {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
          </Button>
        </div>
      </div>
    </div>
  );
}
