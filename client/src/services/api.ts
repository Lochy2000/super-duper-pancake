import axios from 'axios';
import { getAccessToken } from './authService';

// Create axios instance with base configuration
const api = axios.create({
  // baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', // Removed baseURL to use relative paths
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAccessToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting access token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle 401 Unauthorized
      if (error.response.status === 401 && typeof window !== 'undefined') {
        // Redirect to login unless already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/admin/login';
        }
      }
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
