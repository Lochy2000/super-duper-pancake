const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const { ApiError } = require('./errorHandler');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Middleware to protect routes - validates Supabase token
 */
exports.protect = async (req, res, next) => {
  console.log(`>>> ENTERING protect middleware for: ${req.method} ${req.originalUrl}`); 
  // Restore original logic
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      throw new ApiError('Not authorized to access this route', 401);
    }

    try {
      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.error('Supabase auth error:', error);
        throw new ApiError('Not authorized to access this route', 401);
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        // Decide if this should block or just log - depends on requirements
        // If profile is essential for authorization (e.g., checking role), throw error
        // If profile is just extra info, maybe allow proceeding but log error
        // For now, let's log and continue, adjust if needed.
      }

      // Add user to request object
      req.user = {
        id: user.id,
        email: user.email,
        role: profile?.role || 'user', // Default role if profile fails?
        name: profile?.full_name
      };
      
      console.log(`>>> protect middleware PASSED for user: ${req.user.id}`); // Log success
      next();
    } catch (error) {
      // Catch errors during token verification or profile fetch
      console.error('Auth error within protect:', error);
      // Ensure we pass an ApiError for consistent handling
      if (!(error instanceof ApiError)) {
         next(new ApiError('Authentication failed', 401));
      } else {
         next(error);
      }
    }
  } catch (error) {
    // Catch errors like missing token
    console.error('Auth error (outer) within protect:', error);
    if (!(error instanceof ApiError)) {
         next(new ApiError('Not authorized to access this route', 401));
      } else {
         next(error);
      }
  }
};

/**
 * Middleware to check if user has specific role
 * @param  {...string} roles Array of roles to check against
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(`User role ${req.user ? req.user.role : 'undefined'} is not authorized to access this route`, 403);
    }
    next();
  };
};
