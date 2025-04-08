// Load environment variables for testing
require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Increase test timeout
jest.setTimeout(30000);

// Mock Supabase
jest.mock('../src/config/db', () => {
  return {
    auth: {
      signInWithPassword: jest.fn().mockImplementation(({ email, password }) => {
        if (email === 'test@example.com' && password === 'password123') {
          return {
            data: {
              user: { id: 'test-user-id', email },
              session: { access_token: 'mock-token' }
            },
            error: null
          };
        }
        return { data: null, error: { message: 'Invalid login credentials' } };
      }),
      signUp: jest.fn(),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      updateUser: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn()
    },
    from: jest.fn().mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockImplementation((data) => ({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'mock-id', ...data },
          error: null
        })
      })),
      update: jest.fn().mockImplementation((data) => ({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'mock-id', ...data },
          error: null
        })
      })),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'mock-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin'
        },
        error: null
      })
    }))
  };
});

// Mock Resend email service
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => {
      return {
        emails: {
          send: jest.fn().mockResolvedValue({ id: 'mock-email-id', success: true })
        }
      };
    })
  };
});

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
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
  });
});

// Mock PayPal
jest.mock('@paypal/checkout-server-sdk', () => {
  return {
    core: {
      SandboxEnvironment: jest.fn(),
      PayPalHttpClient: jest.fn().mockImplementation(() => {
        return {
          execute: jest.fn().mockResolvedValue({
            statusCode: 201,
            result: {
              id: 'mock-paypal-order-id',
              status: 'COMPLETED'
            }
          })
        };
      })
    },
    orders: {
      OrdersCreateRequest: jest.fn(),
      OrdersCaptureRequest: jest.fn(),
      OrdersGetRequest: jest.fn()
    }
  };
});

// Global teardown
afterAll(() => {
  jest.clearAllMocks();
});
