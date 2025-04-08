require('dotenv').config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_KEY
  },

  // Email Configuration
  email: {
    from: process.env.EMAIL_FROM,
    resendApiKey: process.env.RESEND_API_KEY
  },

  // Payment Configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    mode: process.env.PAYPAL_MODE || 'sandbox',
    sandboxUrl: process.env.SANDBOX_URL || 'https://sandbox.paypal.com'
  },

  // Security
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d' // Token expiration time
  }
};

module.exports = config;
