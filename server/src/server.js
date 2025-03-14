const express = require('express');
const validateEnvVariables = require('./config/validateEnv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./config/db');
const config = require('./config/env');

// Import routes
const authRoutes = require('./routes/auth.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const paymentRoutes = require('./routes/payment.routes');

// Import middleware
const rawBodyMiddleware = require('./middleware/webhooks/rawBodyMiddleware');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { apiLimiter, authLimiter, paymentLimiter } = require('./middleware/rateLimiter');

// Initialize express app
const app = express();
const PORT = config.port;

// Validate environment variables in production
if (config.nodeEnv === 'production') {
  const missingEnvVars = validateEnvVariables();
  if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('Please set these variables in your environment before starting the server in production mode.');
    // In production, we might want to exit, but that's a bit harsh
    // process.exit(1);
  }
}

// Connect to MongoDB
connectDB();

// Middleware

// Special handling for Stripe webhook route - must be before body parsers
// This has to be raw for Stripe signature verification to work
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), rawBodyMiddleware);

// Standard middleware for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Configure CORS with multiple origins support
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const allowedOrigins = [
      config.frontendUrl,
      // Add multiple production/staging URLs as needed
      'https://invoice-pages.vercel.app',
      'https://www.invoice-pages.vercel.app'
    ];
    
    // In development, allow localhost
    if (config.nodeEnv === 'development') {
      allowedOrigins.push('http://localhost:3000');
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'stripe-signature']
};

app.use(cors(corsOptions));
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Request logging

// Create a router for payment webhooks that will be exempt from rate limiting
const webhookRouter = express.Router();

// Define the webhook routes by importing controller directly
const paymentController = require('./controllers/payment.controller');
webhookRouter.post('/stripe/webhook', paymentController.stripeWebhook);

// Apply rate limiting to regular API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/invoices', apiLimiter, invoiceRoutes);
app.use('/api/payments', paymentLimiter, paymentRoutes);

// Exempt webhook routes from rate limiting since they come from Stripe/PayPal
app.use('/api/payments', webhookRouter);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: config.nodeEnv });
});

// Global error handling middleware
app.use(globalErrorHandler);

// Not found middleware
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});
