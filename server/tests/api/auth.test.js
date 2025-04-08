const request = require('supertest');
const express = require('express');
const authRoutes = require('../../src/routes/auth.routes');
const supabase = require('../../src/config/db');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin',
  name: 'Test User'
};

const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin',
  name: 'Test User',
  company_name: 'Test Company',
  company_address: '123 Test St',
  company_phone: '555-1234'
};

const mockSession = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  user: mockUser
};

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login a user successfully', async () => {
      // Mock Supabase responses
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });
      
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockProfile,
        error: null
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should return 400 if email or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' }); // Missing password

      expect(response.status).toBe(400);
    });

    it('should return 401 if credentials are invalid', async () => {
      // Mock Supabase auth error
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials', status: 401 }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile', async () => {
      // Mock authentication middleware
      app.use('/api/auth/me', (req, res, next) => {
        req.user = mockUser;
        next();
      });

      // Mock Supabase response
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockProfile,
        error: null
      });

      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfile);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should log out a user successfully', async () => {
      // Mock Supabase signOut response
      supabase.auth.signOut.mockResolvedValue({
        error: null
      });

      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
