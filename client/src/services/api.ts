import axios from 'axios';
import tokenService from './tokenService';

// Determine API base URL
const getBaseUrl = () => {
  // Use environment variable if available
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api';
  }
  
  // Production fallback (should be set by env var in production)
  return 'https://your-app-name.herokuapp.com/api';
};

// Create an axios instance with baseURL and default headers
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important for CORS with credentials
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle specific error codes
      if (error.response.status === 401) {
        // Handle 401 Unauthorized - e.g., redirect to login
        console.warn('Authentication error detected, redirecting to login');
        
        // Don't redirect if we're already on the login page to avoid redirect loops
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          tokenService.removeToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/login';
          }
        }
      } else if (error.response.status === 403) {
        // Handle 403 Forbidden
        console.warn('Insufficient permissions');
      } else if (error.response.status === 500) {
        // Handle 500 Internal Server Error
        console.error('Server error:', error.response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
