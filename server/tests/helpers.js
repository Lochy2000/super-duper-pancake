/**
 * Test helpers and mock data for the invoice application
 */

const jwt = require('jsonwebtoken');
const config = require('../src/config/env');

// Mock user data
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

const mockPayment = {
  id: 'test-payment-id',
  invoice_id: 'test-invoice-id',
  amount: 1540,
  payment_method: 'stripe',
  payment_id: 'pi_mock123',
  status: 'completed',
  created_at: '2025-03-25'
};

// Generate a test token for authentication
const generateTestToken = (user = mockUser) => {
  return jwt.sign({ id: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

// Mock authentication middleware for Express tests
const mockAuthMiddleware = (req, res, next) => {
  req.user = mockUser;
  next();
};

// Helper to create Express app with routes and middleware
const setupTestApp = (express, routes, path = '/api') => {
  const app = express();
  app.use(express.json());
  app.use(path, routes);
  return app;
};

module.exports = {
  mockUser,
  mockProfile,
  mockClient,
  mockInvoice,
  mockPayment,
  generateTestToken,
  mockAuthMiddleware,
  setupTestApp
};
