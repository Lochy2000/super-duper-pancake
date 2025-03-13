/**
 * Special middleware for Stripe webhooks
 * - Processes raw body needed for Stripe webhook signature verification
 * - Should be applied before the route handler for Stripe webhooks
 */
exports.processStripeWebhook = (req, res, next) => {
  // Skip if not a Stripe webhook request
  if (req.path !== '/api/payments/stripe/webhook') {
    return next();
  }
  
  let data = '';
  
  // Get raw body data for Stripe webhook verification
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', () => {
    // Store the raw body for Stripe webhook verification
    req.rawBody = data;
    next();
  });
};
