import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import * as authService from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<authService.User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to fetch user data
  const fetchUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    fetchUser();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { user: userData } = await authService.login(email, password);
      setUser(userData);
      toast.success('Login successful');
      router.replace('/admin/dashboard');
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      router.replace('/admin/login');
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (data: { name?: string; email?: string }) => {
    try {
      setLoading(true);
      const updatedProfile = await authService.updateProfile(data);
      setUser(prev => prev ? { ...prev, ...updatedProfile } : null);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast.error(error.message || 'Failed to update profile');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    updateProfile,
    isAdmin: user?.role === 'admin'
  };
}
