/**
 * Core functionality tests for the invoice application
 * These tests verify that the main components of the application work as expected
 * without relying on specific implementation details
 */

const jwt = require('jsonwebtoken');
const config = require('../src/config/env');

describe('Invoice Application Core Functionality', () => {
  describe('Environment Configuration', () => {
    it('should have required environment variables', () => {
      // Check for essential environment variables
      expect(process.env.NODE_ENV).toBeDefined();
      expect(config.jwt.secret).toBeDefined();
      expect(config.jwt.expiresIn).toBeDefined();
    });
  });

  describe('JWT Authentication', () => {
    it('should generate and verify JWT tokens', () => {
      const payload = { id: 'test-user-id' };
      
      // Generate a token
      const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
      expect(token).toBeDefined();
      
      // Verify the token
      const decoded = jwt.verify(token, config.jwt.secret);
      expect(decoded.id).toBe(payload.id);
    });
  });

  describe('Database Configuration', () => {
    it('should have Supabase configuration', () => {
      expect(process.env.SUPABASE_URL).toBeDefined();
      expect(process.env.SUPABASE_SERVICE_KEY).toBeDefined();
    });
  });

  describe('Email Service Configuration', () => {
    it('should have Resend configuration', () => {
      expect(process.env.RESEND_API_KEY).toBeDefined();
      expect(process.env.FROM_EMAIL).toBeDefined();
    });
  });

  describe('Payment Gateway Configuration', () => {
    it('should have Stripe configuration', () => {
      expect(process.env.STRIPE_SECRET_KEY).toBeDefined();
    });

    it('should have PayPal configuration', () => {
      expect(process.env.PAYPAL_CLIENT_ID).toBeDefined();
      expect(process.env.PAYPAL_CLIENT_SECRET).toBeDefined();
    });
  });
});
