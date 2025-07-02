import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { usersApi, User, UserCreateData, UserUpdateData, UsersListParams } from '@/services/users'

// Query key factory for users
export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (params?: UsersListParams) => [...usersKeys.lists(), params] as const,
  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
  current: () => [...usersKeys.all, 'current'] as const,
}

// Hook to fetch users list
export function useUsers(params?: UsersListParams) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: () => usersApi.getUsers(params),
    select: (data) => data.data, // Extract the actual data from ApiResponse
  })
}

// Hook to fetch a single user
export function useUser(id: string) {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: () => usersApi.getUser(id),
    select: (data) => data.data,
    enabled: !!id, // Only run query if id is truthy
  })
}

// Hook to fetch current user
export function useCurrentUser() {
  return useQuery({
    queryKey: usersKeys.current(),
    queryFn: () => usersApi.getCurrentUser(),
    select: (data) => data.data,
  })
}

// Hook to create a user
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UserCreateData) => usersApi.createUser(data),
    onSuccess: (response) => {
      // Invalidate and refetch users list to show the new user immediately
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() })
      // Show success toast
      toast.success(`User "${response.data.username}" created successfully!`)
    },
    onError: (error: any) => {
      console.error('Failed to create user:', error)
      // Show error toast
      toast.error(error?.message || 'Failed to create user. Please try again.')
    },
  })
}

// Hook to update a user
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdateData }) =>
      usersApi.updateUser(id, data),
    onSuccess: (response, variables) => {
      // Invalidate users list and specific user detail
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() })
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(variables.id) })
      // Show success toast
      toast.success(`User "${response.data.username}" updated successfully!`)
    },
    onError: (error: any) => {
      console.error('Failed to update user:', error)
      // Show error toast
      toast.error(error?.message || 'Failed to update user. Please try again.')
    },
  })
}

// Hook to delete a user
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, username }: { id: string; username: string }) => usersApi.deleteUser(id),
    onSuccess: (_, variables) => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() })
      // Show success toast
      toast.success(`User "${variables.username}" deleted successfully!`)
    },
    onError: (error: any) => {
      console.error('Failed to delete user:', error)
      // Show error toast
      toast.error(error?.message || 'Failed to delete user. Please try again.')
    },
  })
} 