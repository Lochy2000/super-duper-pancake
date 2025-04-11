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