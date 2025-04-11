const express = require('express');
const validateEnvVariables = require('./config/validateEnv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const paymentRoutes = require('./routes/payment.routes');

// Create Express app
const app = express();

// Validate environment variables
validateEnvVariables();

// Restore original CORS configuration
const corsOptions = {
  origin: true, // Or your specific allowed origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'stripe-signature']
};

// Middleware
app.use(cors(corsOptions)); // Use original options
// app.use(cors()); // Remove default CORS
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Remove TEMPORARY PAYPAL ROUTE TEST ---
/*
const paymentController = require('./controllers/payment.controller');
app.post('/api/payments/paypal/create-order', (req, res, next) => {
  console.log('>>> HIT DIRECT /api/payments/paypal/create-order route in server.js');
  // Call the actual controller function
  paymentController.createPayPalOrder(req, res, next);
});
*/
// --- END TEMPORARY PAYPAL ROUTE TEST ---

// Routes
const rawBodyMiddleware = require('./middleware/webhooks/rawBodyMiddleware');
const { apiLimiter, authLimiter, paymentLimiter } = require('./middleware/rateLimiter');
const paymentController = require('./controllers/payment.controller'); // Ensure this require is present if removed by previous edit
const webhookRouter = express.Router();
webhookRouter.post('/stripe/webhook', express.raw({ type: 'application/json' }), rawBodyMiddleware, paymentController.stripeWebhook);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/invoices', apiLimiter, invoiceRoutes);
// Restore paymentLimiter
app.use('/api/payments', paymentLimiter, paymentRoutes);
app.use('/api/payments', webhookRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: config.nodeEnv });
});

// Global error handling middleware
app.use(errorHandler);

// Not found middleware
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: { 
      message: 'Route not found' 
    }
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
});
