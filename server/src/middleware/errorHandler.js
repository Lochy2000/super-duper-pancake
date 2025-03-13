/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    this.data = data; // Additional error data
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Custom error class for validation errors
 */
class ValidationError extends ApiError {
  constructor(errors) {
    super('Validation failed', 400, errors);
    this.name = 'ValidationError';
  }
}

/**
 * Custom error class for unauthorized access
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Custom error class for not found resources
 */
class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Creates a standard error response
 */
const errorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  const response = {
    success: false,
    error: {
      message,
      code: error.name || 'Error',
      ...(error.data && { details: error.data })
    }
  };
  
  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Mongoose error handler middleware
 */
const handleMongooseErrors = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log the error for debugging
  console.error(err);

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ApiError(message, 400);
  }
  
  // Handle mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate field value: ${field} = ${value}. Please use another value`;
    error = new ApiError(message, 400);
  }
  
  // Handle mongoose cast error
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new ApiError(message, 400);
  }
  
  // Send the error response
  return errorResponse(res, error);
};

/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to Express's default error handler
  if (res.headersSent) {
    return next(err);
  }
  
  // Log the error for debugging (but don't log in tests)
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error:', err.name, err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }
  
  // Handle specific error types
  if (err instanceof ApiError) {
    return errorResponse(res, err);
  }
  
  // Handle Mongoose errors using the existing handler
  if (err.name === 'ValidationError' || err.name === 'CastError' || err.code === 11000) {
    return handleMongooseErrors(err, req, res, next);
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, new UnauthorizedError('Invalid token'));
  }
  
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, new UnauthorizedError('Token expired'));
  }
  
  // Handle other types of errors
  const error = new ApiError(err.message || 'Internal Server Error', err.statusCode || 500);
  return errorResponse(res, error);
};

module.exports = {
  ApiError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  errorResponse,
  handleMongooseErrors,
  globalErrorHandler
};
