/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Stripe error handler middleware
 */
const handleStripeErrors = (err, req, res, next) => {
  if (err.type && err.type.startsWith('Stripe')) {
    const message = err.message || 'An error occurred with the payment processor';
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        type: err.type
      }
    });
  }
  next(err);
};

/**
 * PayPal error handler middleware
 */
const handlePayPalErrors = (err, req, res, next) => {
  if (err.name === 'PayPalError') {
    const message = err.message || 'An error occurred with PayPal';
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        details: err.details
      }
    });
  }
  next(err);
};

/**
 * Supabase error handler middleware
 */
const handleSupabaseErrors = (err, req, res, next) => {
  if (err.message && err.message.includes('Supabase')) {
    const message = err.message || 'Database error occurred';
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: err.code
      }
    });
  }
  next(err);
};

/**
 * JWT error handler middleware
 */
const handleJWTErrors = (err, req, res, next) => {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token. Please log in again.'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Your token has expired. Please log in again.'
      }
    });
  }

  next(err);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle specific error types using the existing handlers
  handleStripeErrors(err, req, res, (error) => {
    handlePayPalErrors(error, req, res, (error) => {
      handleSupabaseErrors(error, req, res, (error) => {
        handleJWTErrors(error, req, res, (error) => {
          // If no specific error handler caught the error, send a generic response
          res.status(error.statusCode).json({
            success: false,
            error: {
              message: error.message || 'An unexpected error occurred',
              ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            }
          });
        });
      });
    });
  });
};

module.exports = {
  ApiError,
  errorHandler,
  handleStripeErrors,
  handlePayPalErrors,
  handleSupabaseErrors,
  handleJWTErrors
};
