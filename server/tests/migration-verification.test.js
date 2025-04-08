/**
 * Migration Verification Tests
 * These tests verify that the application has been properly migrated:
 * 1. From MongoDB to Supabase
 * 2. From Brevo to Resend for email
 * 3. Maintained Stripe and PayPal integrations
 */

describe('Migration Verification', () => {
  describe('Database Migration: MongoDB to Supabase', () => {
    it('should have Supabase configuration', () => {
      // Check that Supabase environment variables exist
      expect(process.env.SUPABASE_URL).toBeDefined();
      expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
      expect(process.env.SUPABASE_SERVICE_KEY).toBeDefined();
    });

    it('should not have MongoDB configuration', () => {
      // Verify MongoDB has been fully replaced
      expect(process.env.MONGODB_URI).toBeUndefined();
    });
  });

  describe('Email Service Migration: Brevo to Resend', () => {
    it('should have Resend configuration', () => {
      // Check that Resend environment variables exist
      expect(process.env.RESEND_API_KEY).toBeDefined();
      expect(process.env.FROM_EMAIL).toBeDefined();
    });

    it('should not have Brevo configuration', () => {
      // Verify Brevo has been fully replaced
      expect(process.env.BREVO_API_KEY).toBeUndefined();
      expect(process.env.SENDINBLUE_API_KEY).toBeUndefined(); // Alternative name for Brevo
    });
  });

  describe('Payment Integrations: Stripe and PayPal', () => {
    it('should maintain Stripe configuration', () => {
      // Check that Stripe environment variables exist
      expect(process.env.STRIPE_SECRET_KEY).toBeDefined();
    });

    it('should maintain PayPal configuration', () => {
      // Check that PayPal environment variables exist
      expect(process.env.PAYPAL_CLIENT_ID).toBeDefined();
      expect(process.env.PAYPAL_CLIENT_SECRET).toBeDefined();
    });
  });
});
