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

// Define paths that should NOT have the auth token attached
const PUBLIC_PATHS = [
  '/api/payments/paypal/create-order',
  '/api/payments/paypal/capture-payment',
  '/api/payments/methods', 
  '/api/invoices/public/' // Add public invoice lookup path
  // Add any other public paths here
];

// Add request interceptor to add auth token conditionally
api.interceptors.request.use(
  async (config) => {
    // Check if the request URL matches any public path
    // Use startsWith to handle dynamic paths like /public/:invoiceNumber
    const isPublicPath = PUBLIC_PATHS.some(path => config.url?.startsWith(path));

    // Only add the token if it's NOT a public path
    if (!isPublicPath) {
      try {
        const token = await getAccessToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        // Log error only for non-public paths where token is expected
        console.error('Error getting access token for protected route:', error);
      }
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
        // Check if the request was for a public path
        const isPublicPath = PUBLIC_PATHS.some(path => error.config.url?.startsWith(path));
        
        // Only redirect if it was NOT a public path that failed (avoids login loops for public access)
        // And if not already on a login page
        if (!isPublicPath && !window.location.pathname.includes('/login')) {
          // --- TEMPORARILY DISABLED --- 
          // window.location.href = '/admin/login'; // Or maybe /client/login if separate?
          console.warn('Intercepted 401 Unauthorized for protected route. Redirect disabled for debugging.'); 
        } else if (isPublicPath) {
            console.warn('Intercepted 401 Unauthorized for supposedly public path:', error.config.url);
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
