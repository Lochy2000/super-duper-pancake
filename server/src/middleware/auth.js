const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

/**
 * Middleware to protect routes - validates JWT token
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized to access this route'
        }
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Check token expiration explicitly
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTimestamp) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Token has expired'
          }
        });
      }

      // Add user to request object
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found'
          }
        });
      }
      
      // Set user in request object
      req.user = user;
      
      // Log successful authentication
      console.log(`User ${user._id} (${user.email}) authenticated successfully`);
      
      next();
    } catch (err) {
      console.error('Token verification error:', err.message);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired token',
          details: err.message
        }
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(error);
  }
};

/**
 * Middleware to check if user has specific role
 * @param  {...string} roles Array of roles to check against
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: `User role ${req.user ? req.user.role : 'undefined'} is not authorized to access this route`
        }
      });
    }
    next();
  };
};
