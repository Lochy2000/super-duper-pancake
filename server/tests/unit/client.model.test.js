const Client = require('../../src/models/client.model');
const supabase = require('../../src/config/db');

describe('Client Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  };

  const mockClient = {
    id: 'test-client-id',
    name: 'Test Client',
    email: 'client@example.com',
    phone: '555-1234',
    address: '123 Client St',
    user_id: 'test-user-id'
  };

  describe('getClients', () => {
    it('should get all clients for a user', async () => {
      // Mock Supabase response
      supabase.from().select().eq().mockResolvedValue({
        data: [mockClient],
        error: null
      });

      const result = await Client.getClients(mockUser.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockClient);
      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should return an empty array if no clients found', async () => {
      // Mock Supabase response with no clients
      supabase.from().select().eq().mockResolvedValue({
        data: [],
        error: null
      });

      const result = await Client.getClients(mockUser.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return null if there is an error', async () => {
      // Mock Supabase error
      supabase.from().select().eq().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await Client.getClients(mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('getClientById', () => {
    it('should get a client by ID', async () => {
      // Mock Supabase response
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockClient,
        error: null
      });

      const result = await Client.getClientById(mockClient.id, mockUser.id);

      expect(result).toEqual(mockClient);
      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', mockClient.id);
    });

    it('should return null if client not found', async () => {
      // Mock Supabase not found response
      supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      const result = await Client.getClientById('non-existent-id', mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('createClient', () => {
    it('should create a new client', async () => {
      const newClient = {
        name: 'New Client',
        email: 'new@example.com',
        phone: '555-5678',
        address: '456 New St',
        user_id: mockUser.id
      };

      // Mock Supabase response
      supabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'new-client-id', ...newClient },
        error: null
      });

      const result = await Client.createClient(newClient);

      expect(result).toEqual({ id: 'new-client-id', ...newClient });
      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(supabase.insert).toHaveBeenCalledWith(newClient);
    });

    it('should return null if creation fails', async () => {
      // Mock Supabase error
      supabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const newClient = {
        name: 'New Client',
        email: 'new@example.com',
        user_id: mockUser.id
      };

      const result = await Client.createClient(newClient);

      expect(result).toBeNull();
    });
  });

  describe('updateClient', () => {
    it('should update a client', async () => {
      const updatedClient = {
        ...mockClient,
        name: 'Updated Client',
        email: 'updated@example.com'
      };

      // Mock Supabase response
      supabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedClient,
        error: null
      });

      const result = await Client.updateClient(
        mockClient.id,
        { name: 'Updated Client', email: 'updated@example.com' },
        mockUser.id
      );

      expect(result).toEqual(updatedClient);
      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(supabase.update).toHaveBeenCalledWith({
        name: 'Updated Client',
        email: 'updated@example.com'
      });
      expect(supabase.eq).toHaveBeenCalledWith('id', mockClient.id);
    });
  });

  describe('deleteClient', () => {
    it('should delete a client', async () => {
      // Mock Supabase response
      supabase.from().delete().eq().mockResolvedValue({
        error: null
      });

      const result = await Client.deleteClient(mockClient.id, mockUser.id);

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', mockClient.id);
    });

    it('should return false if deletion fails', async () => {
      // Mock Supabase error
      supabase.from().delete().eq().mockResolvedValue({
        error: { message: 'Database error' }
      });

      const result = await Client.deleteClient(mockClient.id, mockUser.id);

      expect(result).toBe(false);
    });
  });
});
