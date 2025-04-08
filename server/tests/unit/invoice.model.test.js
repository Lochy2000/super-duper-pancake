const Invoice = require('../../src/models/invoice.model');
const supabase = require('../../src/config/db');

describe('Invoice Model', () => {
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

  const mockInvoice = {
    id: 'test-invoice-id',
    invoice_number: 'INV-2025-001',
    client_id: 'test-client-id',
    items: [
      { description: 'Web Development', quantity: 10, price: 100 },
      { description: 'Design', quantity: 5, price: 80 }
    ],
    subtotal: 1400,
    tax: 140,
    total: 1540,
    status: 'unpaid',
    due_date: '2025-04-25',
    created_at: '2025-03-25',
    updated_at: '2025-03-25',
    user_id: 'test-user-id'
  };

  describe('getInvoices', () => {
    it('should get all invoices for a user', async () => {
      // Mock Supabase response
      supabase.from().select().eq().mockResolvedValue({
        data: [mockInvoice],
        error: null
      });

      const result = await Invoice.getInvoices(mockUser.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockInvoice);
      expect(supabase.from).toHaveBeenCalledWith('invoices');
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should return an empty array if no invoices found', async () => {
      // Mock Supabase response with no invoices
      supabase.from().select().eq().mockResolvedValue({
        data: [],
        error: null
      });

      const result = await Invoice.getInvoices(mockUser.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return null if there is an error', async () => {
      // Mock Supabase error
      supabase.from().select().eq().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await Invoice.getInvoices(mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('getInvoiceById', () => {
    it('should get an invoice by ID', async () => {
      // Mock Supabase response
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockInvoice,
        error: null
      });

      const result = await Invoice.getInvoiceById(mockInvoice.id, mockUser.id);

      expect(result).toEqual(mockInvoice);
      expect(supabase.from).toHaveBeenCalledWith('invoices');
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', mockInvoice.id);
    });

    it('should return null if invoice not found', async () => {
      // Mock Supabase not found response
      supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      const result = await Invoice.getInvoiceById('non-existent-id', mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('createInvoice', () => {
    it('should create a new invoice with a generated invoice number', async () => {
      const newInvoice = {
        client_id: 'test-client-id',
        items: [
          { description: 'Web Development', quantity: 10, price: 100 },
          { description: 'Design', quantity: 5, price: 80 }
        ],
        subtotal: 1400,
        tax: 140,
        total: 1540,
        due_date: '2025-04-25',
        user_id: mockUser.id
      };

      // Mock current date for invoice number generation
      const originalDate = global.Date;
      const mockDate = new Date('2025-03-25T12:00:00Z');
      global.Date = jest.fn(() => mockDate);
      global.Date.now = originalDate.now;

      // Mock Supabase response for getting latest invoice number
      supabase.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock Supabase response for creating invoice
      supabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'new-invoice-id', invoice_number: 'INV-2025-001', ...newInvoice, status: 'unpaid' },
        error: null
      });

      const result = await Invoice.createInvoice(newInvoice);

      expect(result).toEqual({
        id: 'new-invoice-id',
        invoice_number: 'INV-2025-001',
        ...newInvoice,
        status: 'unpaid'
      });
      expect(supabase.from).toHaveBeenCalledWith('invoices');
      expect(supabase.insert).toHaveBeenCalled();

      // Restore original Date
      global.Date = originalDate;
    });

    it('should return null if creation fails', async () => {
      // Mock Supabase response for getting latest invoice number
      supabase.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock Supabase error for creating invoice
      supabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const newInvoice = {
        client_id: 'test-client-id',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        due_date: '2025-04-25',
        user_id: mockUser.id
      };

      const result = await Invoice.createInvoice(newInvoice);

      expect(result).toBeNull();
    });
  });

  describe('updateInvoice', () => {
    it('should update an invoice', async () => {
      const updatedInvoice = {
        ...mockInvoice,
        status: 'paid',
        updated_at: '2025-03-26'
      };

      // Mock Supabase response
      supabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedInvoice,
        error: null
      });

      const result = await Invoice.updateInvoice(
        mockInvoice.id,
        { status: 'paid' },
        mockUser.id
      );

      expect(result).toEqual(updatedInvoice);
      expect(supabase.from).toHaveBeenCalledWith('invoices');
      expect(supabase.update).toHaveBeenCalledWith({
        status: 'paid',
        updated_at: expect.any(String)
      });
      expect(supabase.eq).toHaveBeenCalledWith('id', mockInvoice.id);
    });

    it('should return null if update fails', async () => {
      // Mock Supabase error
      supabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await Invoice.updateInvoice(
        mockInvoice.id,
        { status: 'paid' },
        mockUser.id
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteInvoice', () => {
    it('should delete an invoice', async () => {
      // Mock Supabase response
      supabase.from().delete().eq().mockResolvedValue({
        error: null
      });

      const result = await Invoice.deleteInvoice(mockInvoice.id, mockUser.id);

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('invoices');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', mockInvoice.id);
    });

    it('should return false if deletion fails', async () => {
      // Mock Supabase error
      supabase.from().delete().eq().mockResolvedValue({
        error: { message: 'Database error' }
      });

      const result = await Invoice.deleteInvoice(mockInvoice.id, mockUser.id);

      expect(result).toBe(false);
    });
  });

  describe('getInvoicesByStatus', () => {
    it('should get invoices by status', async () => {
      // Mock Supabase response
      supabase.from().select().eq().eq().mockResolvedValue({
        data: [mockInvoice],
        error: null
      });

      const result = await Invoice.getInvoicesByStatus('unpaid', mockUser.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockInvoice);
      expect(supabase.from).toHaveBeenCalledWith('invoices');
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('status', 'unpaid');
      expect(supabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });
});
