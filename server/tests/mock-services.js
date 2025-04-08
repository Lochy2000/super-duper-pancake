/**
 * Mock external services for testing
 * This file provides mock implementations of Supabase, Resend, Stripe, and PayPal
 * that can be used in tests without making actual API calls
 */

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const Stripe = require('stripe');
const paypal = require('@paypal/checkout-server-sdk');

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
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
};

// Mock Resend
const mockResendClient = {
  emails: {
    send: jest.fn().mockResolvedValue({ id: 'mock-email-id', success: true })
  }
};

// Mock Stripe
const mockStripeClient = {
  customers: {
    create: jest.fn().mockResolvedValue({ id: 'cus_mock123' }),
    retrieve: jest.fn().mockResolvedValue({ id: 'cus_mock123' })
  },
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_mock123',
      client_secret: 'pi_mock_secret',
      status: 'requires_payment_method'
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'pi_mock123',
      status: 'succeeded'
    }),
    update: jest.fn().mockResolvedValue({
      id: 'pi_mock123',
      status: 'succeeded'
    })
  },
  webhooks: {
    constructEvent: jest.fn().mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_mock123',
          metadata: { invoiceId: 'mock-invoice-id' }
        }
      }
    })
  }
};

// Mock PayPal
const mockPayPalClient = {
  execute: jest.fn().mockResolvedValue({
    statusCode: 201,
    result: {
      id: 'mock-paypal-order-id',
      status: 'COMPLETED'
    }
  })
};

// Setup mocks
const setupMocks = () => {
  // Mock Supabase
  jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn().mockImplementation(() => mockSupabaseClient)
  }));

  // Mock Resend
  jest.mock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => mockResendClient)
  }));

  // Mock Stripe
  jest.mock('stripe', () => (
    jest.fn().mockImplementation(() => mockStripeClient)
  ));

  // Mock PayPal
  jest.mock('@paypal/checkout-server-sdk', () => ({
    core: {
      SandboxEnvironment: jest.fn(),
      PayPalHttpClient: jest.fn().mockImplementation(() => mockPayPalClient)
    },
    orders: {
      OrdersCreateRequest: jest.fn(),
      OrdersCaptureRequest: jest.fn(),
      OrdersGetRequest: jest.fn()
    }
  }));
};

// Reset all mocks
const resetMocks = () => {
  jest.clearAllMocks();
};

module.exports = {
  mockSupabaseClient,
  mockResendClient,
  mockStripeClient,
  mockPayPalClient,
  setupMocks,
  resetMocks
};
