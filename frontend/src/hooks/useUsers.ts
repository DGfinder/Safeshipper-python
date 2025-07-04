import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_display: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_login: string | null;
  date_joined: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_staff?: boolean;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  is_staff?: boolean;
}

// API functions
const fetchUsers = async (token: string): Promise<User[]> => {
  const response = await fetch('/api/v1/users/', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch users' }));
    throw new Error(error.message || 'Failed to fetch users');
  }

  return response.json();
};

const createUser = async (data: CreateUserRequest, token: string): Promise<User> => {
  const response = await fetch('/api/v1/users/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create user' }));
    throw new Error(error.message || 'Failed to create user');
  }

  return response.json();
};

const updateUser = async (id: string, data: UpdateUserRequest, token: string): Promise<User> => {
  const response = await fetch(`/api/v1/users/${id}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update user' }));
    throw new Error(error.message || 'Failed to update user');
  }

  return response.json();
};

const deleteUser = async (id: string, token: string): Promise<void> => {
  const response = await fetch(`/api/v1/users/${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete user' }));
    throw new Error(error.message || 'Failed to delete user');
  }
};

// Custom hooks
export const useUsers = () => {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(token!),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data, token!),
    onSuccess: () => {
      // Invalidate and refetch users
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => 
      updateUser(id, data, token!),
    onSuccess: () => {
      // Invalidate and refetch users
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: (id: string) => deleteUser(id, token!),
    onSuccess: () => {
      // Invalidate and refetch users
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};