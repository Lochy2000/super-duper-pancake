const request = require('supertest');
const express = require('express');
const paymentRoutes = require('../../src/routes/payment.routes');
const supabase = require('../../src/config/db');
const stripe = require('stripe');
const paypal = require('@paypal/checkout-server-sdk');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/payments', paymentRoutes);

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin'
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

const mockPayment = {
  id: 'test-payment-id',
  invoice_id: 'test-invoice-id',
  amount: 1540,
  payment_method: 'stripe',
  payment_id: 'pi_mock123',
  status: 'completed',
  created_at: '2025-03-25'
};

describe('Payment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware for all routes
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('POST /api/payments/stripe/create-intent', () => {
    it('should create a Stripe payment intent', async () => {
      // Mock invoice fetch
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockInvoice,
        error: null
      });

      const response = await request(app)
        .post('/api/payments/stripe/create-intent')
        .send({ invoiceId: mockInvoice.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.clientSecret).toBe('pi_mock_secret');
    });

    it('should return 404 if invoice not found', async () => {
      // Mock invoice not found
      supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found', status: 404 }
      });

      const response = await request(app)
        .post('/api/payments/stripe/create-intent')
        .send({ invoiceId: 'non-existent-id' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/payments/stripe/webhook', () => {
    it('should process a successful Stripe webhook event', async () => {
      // Mock invoice fetch
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockInvoice,
        error: null
      });

      // Mock payment creation
      supabase.from().insert().select().single.mockResolvedValue({
        data: mockPayment,
        error: null
      });

      // Mock invoice update
      const paidInvoice = { ...mockInvoice, status: 'paid' };
      supabase.from().update().eq().select().single.mockResolvedValue({
        data: paidInvoice,
        error: null
      });

      const response = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('stripe-signature', 'mock-signature')
        .send(JSON.stringify({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_mock123',
              metadata: { invoiceId: mockInvoice.id }
            }
          }
        }));

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/payments/paypal/create-order', () => {
    it('should create a PayPal order', async () => {
      // Mock invoice fetch
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockInvoice,
        error: null
      });

      const response = await request(app)
        .post('/api/payments/paypal/create-order')
        .send({ invoiceId: mockInvoice.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.orderId).toBe('mock-paypal-order-id');
    });
  });

  describe('POST /api/payments/paypal/capture-order', () => {
    it('should capture a PayPal order', async () => {
      // Mock invoice fetch
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockInvoice,
        error: null
      });

      // Mock payment creation
      supabase.from().insert().select().single.mockResolvedValue({
        data: { ...mockPayment, payment_method: 'paypal', payment_id: 'mock-paypal-order-id' },
        error: null
      });

      // Mock invoice update
      const paidInvoice = { ...mockInvoice, status: 'paid' };
      supabase.from().update().eq().select().single.mockResolvedValue({
        data: paidInvoice,
        error: null
      });

      const response = await request(app)
        .post('/api/payments/paypal/capture-order')
        .send({ 
          orderId: 'mock-paypal-order-id',
          invoiceId: mockInvoice.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('COMPLETED');
    });
  });

  describe('GET /api/payments/invoice/:invoiceId', () => {
    it('should get payments for an invoice', async () => {
      // Mock payments fetch
      supabase.from().select().eq().mockResolvedValue({
        data: [mockPayment],
        error: null
      });

      const response = await request(app).get(`/api/payments/invoice/${mockInvoice.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].invoice_id).toBe(mockInvoice.id);
    });
  });
});
