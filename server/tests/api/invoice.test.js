const request = require('supertest');
const express = require('express');
const invoiceRoutes = require('../../src/routes/invoice.routes');
const supabase = require('../../src/config/db');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/invoices', invoiceRoutes);

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin'
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

describe('Invoice API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware for all routes
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('GET /api/invoices', () => {
    it('should get all invoices for the user', async () => {
      // Mock Supabase response
      supabase.from().select().eq().mockResolvedValue({
        data: [mockInvoice],
        error: null
      });

      const response = await request(app).get('/api/invoices');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].invoice_number).toBe('INV-2025-001');
    });

    it('should handle errors when fetching invoices', async () => {
      // Mock Supabase error response
      supabase.from().select().eq().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const response = await request(app).get('/api/invoices');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/invoices', () => {
    it('should create a new invoice', async () => {
      // Mock client fetch
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockClient,
        error: null
      });

      // Mock invoice creation
      supabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockInvoice,
        error: null
      });

      const invoiceData = {
        client_id: 'test-client-id',
        items: [
          { description: 'Web Development', quantity: 10, price: 100 },
          { description: 'Design', quantity: 5, price: 80 }
        ],
        subtotal: 1400,
        tax: 140,
        total: 1540,
        due_date: '2025-04-25'
      };

      const response = await request(app)
        .post('/api/invoices')
        .send(invoiceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoice_number).toBeDefined();
      expect(response.body.data.status).toBe('unpaid');
    });

    it('should return 400 if required fields are missing', async () => {
      const invoiceData = {
        // Missing client_id and other required fields
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0
      };

      const response = await request(app)
        .post('/api/invoices')
        .send(invoiceData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('should get a single invoice by ID', async () => {
      // Mock Supabase response
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockInvoice,
        error: null
      });

      const response = await request(app).get(`/api/invoices/${mockInvoice.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockInvoice.id);
    });

    it('should return 404 if invoice not found', async () => {
      // Mock Supabase not found response
      supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found', status: 404 }
      });

      const response = await request(app).get('/api/invoices/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/invoices/:id', () => {
    it('should update an invoice', async () => {
      // Mock invoice fetch
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockInvoice,
        error: null
      });

      // Mock invoice update
      const updatedInvoice = { ...mockInvoice, status: 'paid' };
      supabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedInvoice,
        error: null
      });

      const response = await request(app)
        .put(`/api/invoices/${mockInvoice.id}`)
        .send({ status: 'paid' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('paid');
    });
  });

  describe('DELETE /api/invoices/:id', () => {
    it('should delete an invoice', async () => {
      // Mock invoice fetch
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockInvoice,
        error: null
      });

      // Mock invoice deletion
      supabase.from().delete().eq().mockResolvedValue({
        error: null
      });

      const response = await request(app).delete(`/api/invoices/${mockInvoice.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invoice deleted successfully');
    });
  });

  describe('POST /api/invoices/:id/send', () => {
    it('should send an invoice email', async () => {
      // Mock invoice fetch
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockInvoice,
        error: null
      });

      // Mock client fetch
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockClient,
        error: null
      });

      const response = await request(app)
        .post(`/api/invoices/${mockInvoice.id}/send`)
        .send({ email: 'client@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Invoice sent');
    });
  });

  describe('PUT /api/invoices/:id/pay', () => {
    it('should mark an invoice as paid', async () => {
      // Mock invoice fetch
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockInvoice,
        error: null
      });

      // Mock invoice update
      const paidInvoice = { ...mockInvoice, status: 'paid' };
      supabase.from().update().eq().select().single.mockResolvedValue({
        data: paidInvoice,
        error: null
      });

      const response = await request(app).put(`/api/invoices/${mockInvoice.id}/pay`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('paid');
    });
  });
});
