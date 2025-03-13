import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import * as authService from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<authService.User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if auth token exists and fetch user data
    const fetchUser = async () => {
      try {
        if (authService.isLoggedIn()) {
          const response = await authService.getCurrentUser();
          setUser(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', email);
      const response = await authService.login(email, password);
      
      console.log('Login response:', response.data);
      
      if (response.data && response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        setUser(response.data.user);
        return true;
      } else {
        console.error('Invalid login response format:', response.data);
        toast.error('Server returned invalid response');
        return false;
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMessage = error.response?.data?.error?.message || 'Invalid credentials';
      toast.error(errorMessage);
      return false;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    router.push('/');
  };

  return { user, loading, login, logout };
}
