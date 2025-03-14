/**
 * Validates that required environment variables are set in production environment
 * @returns {Array} - Array of missing environment variables
 */
const validateEnvVariables = () => {
  // Only validate in production
  if (process.env.NODE_ENV !== 'production') {
    return [];
  }

  const requiredVariables = [
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
    'FRONTEND_URL'
  ];

  // At least one payment method must be configured
  const paymentMethods = [
    ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']
  ];

  // At least one email method must be configured
  const emailMethods = [
    ['SENDGRID_API_KEY'],
    ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD']
  ];

  // Check for missing required variables
  const missing = requiredVariables.filter(variable => {
    return !process.env[variable];
  });

  // Check that at least one payment method is fully configured
  const hasConfiguredPaymentMethod = paymentMethods.some(method => {
    return method.every(variable => process.env[variable]);
  });

  if (!hasConfiguredPaymentMethod) {
    missing.push('PAYMENT_METHOD (at least one payment method must be fully configured)');
  }

  // Check that at least one email method is configured
  const hasConfiguredEmailMethod = emailMethods.some(method => {
    return method.every(variable => process.env[variable]);
  });

  if (!hasConfiguredEmailMethod) {
    missing.push('EMAIL_METHOD (at least one email method must be configured)');
  }

  return missing;
};

module.exports = validateEnvVariables;
