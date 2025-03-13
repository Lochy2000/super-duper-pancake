import axios from 'axios';

/**
 * Token service to handle authentication token lifecycle
 */
class TokenService {
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    // Try to parse the token
    try {
      // JWT tokens are encoded in three parts: header.payload.signature
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      
      // Check if token has expired
      const expirationTime = decodedPayload.exp * 1000; // Convert from seconds to milliseconds
      return Date.now() >= expirationTime;
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return true; // If we can't parse the token, consider it expired
    }
  }

  // Helper to check if user is logged in with a valid token
  isLoggedIn(): boolean {
    return this.getToken() !== null && !this.isTokenExpired();
  }
}

export default new TokenService();
