const express = require('express');
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

// Connect to MongoDB
connectDB();

// Middleware

// Special handling for Stripe webhook route - must be before body parsers
// This has to be raw for Stripe signature verification to work
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), rawBodyMiddleware);

// Standard middleware for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
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
