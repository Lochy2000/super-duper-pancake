const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/user.model');
const supabase = require('../../src/config/db');
const config = require('../../src/config/env');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe('generateToken', () => {
    it('should generate a JWT token for a user', () => {
      // Mock JWT sign
      jwt.sign.mockReturnValue('mock-token');

      const token = User.generateToken(mockUser);

      expect(token).toBe('mock-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockUser.id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      // Mock JWT verify
      jwt.verify.mockReturnValue({ id: mockUser.id });

      const result = User.verifyToken('valid-token');

      expect(result).toEqual({ id: mockUser.id });
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', config.jwt.secret);
    });

    it('should return null for an invalid token', () => {
      // Mock JWT verify to throw an error
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = User.verifyToken('invalid-token');

      expect(result).toBeNull();
      expect(jwt.verify).toHaveBeenCalledWith('invalid-token', config.jwt.secret);
    });
  });

  describe('authenticate', () => {
    it('should authenticate a user with valid credentials', async () => {
      // Mock Supabase response
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock profile fetch
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockProfile,
        error: null
      });

      const result = await User.authenticate('test@example.com', 'password123');

      expect(result).toEqual(mockProfile);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should return null if authentication fails', async () => {
      // Mock Supabase auth error
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });

      const result = await User.authenticate('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      // Mock bcrypt hash
      bcrypt.hash.mockResolvedValue('hashed-password');

      // Mock Supabase auth response
      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-id', email: 'new@example.com' } },
        error: null
      });

      // Mock profile creation
      supabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'new-user-id', email: 'new@example.com', role: 'user', name: 'New User' },
        error: null
      });

      const newUser = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      };

      const result = await User.register(newUser);

      expect(result).toEqual({
        id: 'new-user-id',
        email: 'new@example.com',
        role: 'user',
        name: 'New User'
      });
    });

    it('should return null if registration fails', async () => {
      // Mock Supabase auth error
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' }
      });

      const newUser = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User'
      };

      const result = await User.register(newUser);

      expect(result).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('should get a user profile by ID', async () => {
      // Mock profile fetch
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockProfile,
        error: null
      });

      const result = await User.getProfile('test-user-id');

      expect(result).toEqual(mockProfile);
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', 'test-user-id');
    });

    it('should return null if profile not found', async () => {
      // Mock profile not found
      supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      const result = await User.getProfile('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update a user profile', async () => {
      const updatedProfile = {
        ...mockProfile,
        name: 'Updated Name',
        company_name: 'Updated Company'
      };

      // Mock profile update
      supabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedProfile,
        error: null
      });

      const result = await User.updateProfile('test-user-id', {
        name: 'Updated Name',
        company_name: 'Updated Company'
      });

      expect(result).toEqual(updatedProfile);
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.update).toHaveBeenCalledWith({
        name: 'Updated Name',
        company_name: 'Updated Company'
      });
      expect(supabase.eq).toHaveBeenCalledWith('id', 'test-user-id');
    });
  });
});
