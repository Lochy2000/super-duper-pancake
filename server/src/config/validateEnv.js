/**
 * Validates required environment variables
 * @returns {Array} Array of missing environment variables
 */
const validateEnvVariables = () => {
  const requiredVars = [
    // Supabase Configuration
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY', // Changed from SUPABASE_SERVICE_ROLE_KEY to match .env
    
    // Email Configuration (optional during development)
    // 'RESEND_API_KEY',
    // 'EMAIL_FROM',
    
    // Payment Configuration (optional during development)
    // 'STRIPE_SECRET_KEY',
    // 'STRIPE_WEBHOOK_SECRET',
    // 'PAYPAL_CLIENT_ID',
    // 'PAYPAL_CLIENT_SECRET',
    // 'PAYPAL_MODE',
    
    // Security (optional during development)
    // 'JWT_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('Missing environment variables:', missingVars);
  }
  
  return missingVars;
};

module.exports = validateEnvVariables;
