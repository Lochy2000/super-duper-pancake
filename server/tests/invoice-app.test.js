/**
 * Main test file for the Invoice Application
 * Tests the core functionality using the actual environment variables
 */

const config = require('../src/config/env');
const User = require('../src/models/user.model');
const jwt = require('jsonwebtoken');

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin',
  name: 'Test User'
};

describe('Invoice Application', () => {
  describe('Environment Configuration', () => {
    it('should have all required environment variables', () => {
      // Check Supabase configuration (migrated from MongoDB)
      expect(process.env.SUPABASE_URL).toBeDefined();
      expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
      expect(process.env.SUPABASE_SERVICE_KEY).toBeDefined();
      
      // Check Resend configuration (migrated from Brevo)
      expect(process.env.RESEND_API_KEY).toBeDefined();
      expect(process.env.FROM_EMAIL).toBeDefined();
      
      // Check payment gateway configuration
      expect(process.env.STRIPE_SECRET_KEY).toBeDefined();
      expect(process.env.STRIPE_WEBHOOK_SECRET).toBeDefined();
      expect(process.env.PAYPAL_CLIENT_ID).toBeDefined();
      expect(process.env.PAYPAL_CLIENT_SECRET).toBeDefined();
      
      // Check JWT configuration
      expect(config.jwt.secret).toBeDefined();
      expect(config.jwt.expiresIn).toBeDefined();
    });
  });
  
  describe('JWT Authentication', () => {
    it('should generate and verify JWT tokens', () => {
      // Generate a token using the User model
      const token = User.generateToken(mockUser);
      expect(token).toBeDefined();
      
      // Verify the token
      const decoded = jwt.verify(token, config.jwt.secret);
      expect(decoded.id).toBe(mockUser.id);
      
      // Verify using the User model
      const verifiedToken = User.verifyToken(token);
      expect(verifiedToken).toBeDefined();
      expect(verifiedToken.id).toBe(mockUser.id);
    });
    
    it('should return null for invalid tokens', () => {
      const result = User.verifyToken('invalid-token');
      expect(result).toBeNull();
    });
  });
  
  describe('Database Migration', () => {
    it('should use Supabase configuration', () => {
      const supabase = require('../src/config/db');
      expect(supabase).toBeDefined();
    });
  });
  
  describe('Email Service Migration', () => {
    it('should use Resend configuration', () => {
      const emailService = require('../src/services/email.service');
      expect(emailService).toBeDefined();
      expect(typeof emailService.sendInvoiceEmail).toBe('function');
    });
  });
  
  describe('Payment Processing', () => {
    it('should have Stripe configuration', () => {
      const Stripe = require('stripe');
      expect(Stripe).toBeDefined();
    });
    
    it('should have PayPal configuration', () => {
      const paypal = require('@paypal/checkout-server-sdk');
      expect(paypal).toBeDefined();
    });
  });
});
