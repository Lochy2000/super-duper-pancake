/**
 * Raw body middleware for Stripe webhooks
 * Stores the raw request body as req.rawBody, which is needed for webhook signature verification
 */
module.exports = (req, res, next) => {
  let data = '';
  
  // Skip if not a POST request or wrong content-type
  if (req.method !== 'POST' || !req.headers['content-type'].includes('application/json')) {
    return next();
  }
  
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
};
