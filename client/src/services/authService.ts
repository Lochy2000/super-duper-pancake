import api from './api';
import tokenService from './tokenService';

export interface User {
  _id?: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Login
export const login = (email: string, password: string) => {
  return api.post<LoginResponse>('/api/auth/login', { email, password })
    .then(response => {
      // Save token
      if (response.data && response.data.token) {
        tokenService.setToken(response.data.token);
      }
      return response;
    });
};

// Register
export const register = (name: string, email: string, password: string) => {
  return api.post<LoginResponse>('/api/auth/register', { name, email, password });
};

// Get current user
export const getCurrentUser = () => {
  return api.get<User>('/api/auth/me');
};

// Update profile
export const updateProfile = (data: { name: string; email: string }) => {
  return api.put<User>('/api/auth/profile', data);
};

// Change password
export const changePassword = (currentPassword: string, newPassword: string) => {
  return api.put<{ success: boolean; message: string }>('/api/auth/password', {
    currentPassword,
    newPassword
  });
};

// Logout (client-side only - just removes the token)
export const logout = () => {
  tokenService.removeToken();
};

// Check if user is logged in
export const isLoggedIn = () => {
  return tokenService.isLoggedIn();
};
