/**
 * Rate limiting middleware to prevent API abuse
 * This simple in-memory implementation is suitable for single-server deployments
 * For production with multiple servers, consider using Redis or another shared store
 */

// In-memory store for rate limiting
const ipRequests = new Map();

/**
 * Rate limiter middleware factory
 * @param {Object} options Rate limiting options
 * @param {number} options.windowMs Time window in milliseconds
 * @param {number} options.maxRequests Max requests per window
 * @param {string} options.message Error message to send
 * @returns {Function} Express middleware function
 */
const rateLimiter = ({ windowMs = 15 * 60 * 1000, maxRequests = 100, message = 'Too many requests' } = {}) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Get current timestamp
    const now = Date.now();
    
    // Initialize or get the requests array for this IP
    if (!ipRequests.has(ip)) {
      ipRequests.set(ip, []);
    }
    
    const requests = ipRequests.get(ip);
    
    // Filter out requests outside the current window
    const windowRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    // Check if IP has exceeded the rate limit
    if (windowRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          message,
          code: 'RateLimitExceeded',
          retryAfter: Math.ceil((windowRequests[0] + windowMs - now) / 1000)
        }
      });
    }
    
    // Add current request timestamp
    windowRequests.push(now);
    ipRequests.set(ip, windowRequests);
    
    // Clean up old entries periodically (every 100 requests)
    if (Math.random() < 0.01) {
      const cleanupTime = now - windowMs;
      ipRequests.forEach((requests, ip) => {
        const validRequests = requests.filter(timestamp => timestamp > cleanupTime);
        if (validRequests.length === 0) {
          ipRequests.delete(ip);
        } else {
          ipRequests.set(ip, validRequests);
        }
      });
    }
    
    next();
  };
};

// Preset rate limiters for different API routes
const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later'
});

// More strict limiter for authentication routes
const authLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 login attempts per hour
  message: 'Too many login attempts from this IP, please try again later'
});

// Strict limiter for payment-related routes
const paymentLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 payment requests per hour
  message: 'Too many payment requests from this IP, please try again later'
});

module.exports = {
  rateLimiter,
  apiLimiter,
  authLimiter,
  paymentLimiter
};
