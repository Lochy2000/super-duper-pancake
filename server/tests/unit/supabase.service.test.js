const supabase = require('../../src/config/db');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn().mockImplementation(() => ({
      auth: {
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        updateUser: jest.fn(),
        getUser: jest.fn(),
        getSession: jest.fn()
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  };
});

describe('Supabase Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a Supabase client with correct credentials', () => {
    // Check that createClient was called with the correct parameters
    expect(createClient).toHaveBeenCalledWith(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  });

  describe('Profiles Table Operations', () => {
    it('should fetch a profile by ID', async () => {
      const mockProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        name: 'Test User'
      };

      // Mock the Supabase response
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockProfile,
        error: null
      });

      // Call the method that uses Supabase
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'test-user-id')
        .single();

      // Verify the result
      expect(result.data).toEqual(mockProfile);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('id', 'test-user-id');
    });

    it('should create a new profile', async () => {
      const newProfile = {
        id: 'new-user-id',
        email: 'new@example.com',
        role: 'user',
        name: 'New User'
      };

      // Mock the Supabase response
      supabase.from().insert().select().single.mockResolvedValue({
        data: newProfile,
        error: null
      });

      // Call the method that uses Supabase
      const result = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      // Verify the result
      expect(result.data).toEqual(newProfile);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.insert).toHaveBeenCalledWith(newProfile);
    });

    it('should update a profile', async () => {
      const updatedProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        name: 'Updated Name'
      };

      // Mock the Supabase response
      supabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedProfile,
        error: null
      });

      // Call the method that uses Supabase
      const result = await supabase
        .from('profiles')
        .update({ name: 'Updated Name' })
        .eq('id', 'test-user-id')
        .select()
        .single();

      // Verify the result
      expect(result.data).toEqual(updatedProfile);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.update).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(supabase.eq).toHaveBeenCalledWith('id', 'test-user-id');
    });

    it('should delete a profile', async () => {
      // Mock the Supabase response
      supabase.from().delete().eq().mockResolvedValue({
        error: null
      });

      // Call the method that uses Supabase
      const result = await supabase
        .from('profiles')
        .delete()
        .eq('id', 'test-user-id');

      // Verify the result
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', 'test-user-id');
    });
  });

  describe('Authentication Operations', () => {
    it('should sign in a user with email and password', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com'
      };

      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        user: mockUser
      };

      // Mock the Supabase auth response
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Call the auth method
      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      });

      // Verify the result
      expect(result.data.user).toEqual(mockUser);
      expect(result.data.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should sign out a user', async () => {
      // Mock the Supabase auth response
      supabase.auth.signOut.mockResolvedValue({
        error: null
      });

      // Call the auth method
      const result = await supabase.auth.signOut();

      // Verify the result
      expect(result.error).toBeNull();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
