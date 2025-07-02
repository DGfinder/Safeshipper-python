import { z } from 'zod'
import { apiService, ApiResponse } from './api';

// Types matching the Django backend
export type UserRole = 'admin' | 'manager' | 'dispatcher' | 'driver' | 'operator' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended';

// Zod schema for user creation form validation
export const userCreateSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  role: z.enum(['admin', 'manager', 'dispatcher', 'driver', 'operator', 'viewer'], {
    required_error: 'Please select a role'
  }),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[1-9]\d{1,14}$/.test(val), {
      message: 'Please enter a valid phone number'
    }),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Infer TypeScript type from schema
export type UserCreateFormValues = z.infer<typeof userCreateSchema>

// Zod schema for user editing (passwords optional)
export const userEditSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  role: z.enum(['admin', 'manager', 'dispatcher', 'driver', 'operator', 'viewer'], {
    required_error: 'Please select a role'
  }),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[1-9]\d{1,14}$/.test(val), {
      message: 'Please enter a valid phone number'
    }),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: 'Password must be at least 8 characters'
    })
    .refine((val) => !val || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val), {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  confirmPassword: z
    .string()
    .optional(),
}).refine((data) => {
  // Only validate password confirmation if password is provided
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword
  }
  return true
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Infer TypeScript type from edit schema
export type UserEditFormValues = z.infer<typeof userEditSchema>

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