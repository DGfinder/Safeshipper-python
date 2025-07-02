import { apiService, ApiResponse } from './api';

// Types matching the Django backend
export type UserRole = 'admin' | 'manager' | 'dispatcher' | 'driver' | 'operator' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  date_joined: string;
  last_login?: string;
  is_active: boolean;
  is_staff: boolean;
  depot?: {
    id: string;
    name: string;
  };
  area?: {
    id: string;
    name: string;
  };
}

export interface UserCreateData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  password: string;
  depot?: string;
  area?: string;
}

export interface UserUpdateData {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  phone?: string;
  is_active?: boolean;
  depot?: string;
  area?: string;
}

export interface UsersListParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  depot?: string;
  area?: string;
  is_active?: boolean;
  is_staff?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const usersApi = {
  // Get all users with optional filtering
  async getUsers(params?: UsersListParams): Promise<ApiResponse<User[]>> {
    return apiService.get<User[]>('/users/', params);
  },

  // Get a specific user by ID
  async getUser(id: string): Promise<ApiResponse<User>> {
    return apiService.get<User>(`/users/${id}/`);
  },

  // Create a new user
  async createUser(data: UserCreateData): Promise<ApiResponse<User>> {
    return apiService.post<User>('/users/', data);
  },

  // Update a user
  async updateUser(id: string, data: UserUpdateData): Promise<ApiResponse<User>> {
    return apiService.patch<User>(`/users/${id}/`, data);
  },

  // Delete a user
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/users/${id}/`);
  },

  // Get current user profile
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiService.get<User>('/users/me/');
  },

  // Update current user profile
  async updateCurrentUser(data: Partial<UserUpdateData>): Promise<ApiResponse<User>> {
    return apiService.patch<User>('/users/me/', data);
  }
}; 