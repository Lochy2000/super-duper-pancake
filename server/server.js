const express = require('express');
const cors = require('cors');
const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'https://super-duper-pancake-client.vercel.app',  // Vercel production URL
    'https://*.vercel.app',                           // All Vercel preview deployments
    'http://localhost:3000'                           // Local development
  ],
  credentials: true
}));

app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend connection successful!',
    timestamp: new Date().toISOString()
  });
});

const authRoutes = require('./src/routes/auth.routes');
const invoiceRoutes = require('./src/routes/invoice.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const clientRoutes = require('./src/routes/client.routes');
const errorHandler = require('./src/middleware/errorHandler');

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/client', clientRoutes);

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 