const stripe = require('stripe')(require('../config/env').stripe.secretKey);
const paypal = require('@paypal/checkout-server-sdk');
const config = require('../config/env');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const { ApiError } = require('../middleware/errorHandler');
const emailService = require('../services/email.service');

// Set up PayPal client
const getPayPalClient = () => {
  const environment = config.paypal.mode === 'live'
    ? new paypal.core.LiveEnvironment(config.paypal.clientId, config.paypal.clientSecret)
    : new paypal.core.SandboxEnvironment(config.paypal.clientId, config.paypal.clientSecret);
  
  return new paypal.core.PayPalHttpClient(environment);
};

/**
 * @desc    Get available payment methods
 * @route   GET /api/payments/methods
 * @access  Public
 */
exports.getPaymentMethods = async (req, res, next) => {
  try {
    // Check which payment methods are configured
    const methods = [];
    
    if (config.stripe.secretKey) {
      methods.push({ id: 'stripe', name: 'stripe' });
    }
    
    if (config.paypal.clientId && config.paypal.clientSecret) {
      methods.push({ id: 'paypal', name: 'paypal' });
    }
    
    res.status(200).json({
      success: true,
      data: methods
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Stripe payment intent
 * @route   POST /api/payments/stripe/create-intent
 * @access  Public
 */
exports.createStripePaymentIntent = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    
    if (!invoiceId) {
      throw new ApiError('Invoice ID is required', 400);
    }
    
    // Find invoice
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      throw new ApiError(`Invoice not found with id of ${invoiceId}`, 404);
    }
    
    if (invoice.status === 'paid') {
      throw new ApiError('This invoice has already been paid', 400);
    }
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.total * 100), // Stripe expects amount in cents
      currency: 'usd',
      metadata: {
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        clientEmail: invoice.clientEmail,
        integration_check: 'accept_a_payment'
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
        amount: invoice.total
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm Stripe payment
 * @route   POST /api/payments/stripe/confirm
 * @access  Public
 */
exports.confirmStripePayment = async (req, res, next) => {
  try {
    const { paymentIntentId, invoiceId } = req.body;
    
    if (!paymentIntentId || !invoiceId) {
      throw new ApiError('Payment Intent ID and Invoice ID are required', 400);
    }
    
    // Find invoice
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      throw new ApiError(`Invoice not found with id of ${invoiceId}`, 404);
    }
    
    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new ApiError(`Payment has not been completed. Status: ${paymentIntent.status}`, 400);
    }
    
    // Create payment record
    const payment = await Payment.create({
      invoiceId: invoice._id,
      method: 'stripe',
      transactionId: paymentIntentId,
      amount: invoice.total,
      status: 'success',
      metadata: {
        stripePaymentIntent: paymentIntent.id,
        paymentMethod: paymentIntent.payment_method
      }
    });
    
    // Update invoice status
    invoice.status = 'paid';
    invoice.paymentMethod = 'stripe';
    invoice.transactionId = paymentIntentId;
    await invoice.save();
    
    // Send confirmation email
    await emailService.sendPaymentConfirmationEmail(invoice);
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle Stripe webhook
 * @route   POST /api/payments/stripe/webhook
 * @access  Public
 */
exports.stripeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      return res.status(400).json({ success: false, error: 'Stripe signature missing' });
    }
    
    let event;
    
    try {
      // For rawBody to work, we need to have used the rawBodyMiddleware
      // and the route should be using express.raw({ type: 'application/json' })
      const payload = req.rawBody || req.body;
      
      if (!payload) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing request body, ensure rawBodyMiddleware is applied to this route' 
        });
      }
      
      // For string payload
      const payloadForVerification = typeof payload === 'string' 
        ? payload 
        : JSON.stringify(payload);
      
      event = stripe.webhooks.constructEvent(
        payloadForVerification,
        signature,
        config.stripe.webhookSecret
      );
    } catch (err) {
      console.error('Webhook error:', err.message);
      return res.status(400).json({ success: false, error: `Webhook signature verification failed: ${err.message}` });
    }
    
    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const invoiceId = paymentIntent.metadata.invoiceId;
      
      // Find invoice
      const invoice = await Invoice.findById(invoiceId);
      
      if (invoice && invoice.status !== 'paid') {
        // Create payment record
        await Payment.create({
          invoiceId: invoice._id,
          method: 'stripe',
          transactionId: paymentIntent.id,
          amount: invoice.total,
          status: 'success',
          metadata: {
            stripePaymentIntent: paymentIntent.id,
            paymentMethod: paymentIntent.payment_method
          }
        });
        
        // Update invoice status
        invoice.status = 'paid';
        invoice.paymentMethod = 'stripe';
        invoice.transactionId = paymentIntent.id;
        await invoice.save();
        
        // Send confirmation email
        await emailService.sendPaymentConfirmationEmail(invoice);
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create PayPal order
 * @route   POST /api/payments/paypal/create-order
 * @access  Public
 */
exports.createPayPalOrder = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    
    if (!invoiceId) {
      throw new ApiError('Invoice ID is required', 400);
    }
    
    // Find invoice
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      throw new ApiError(`Invoice not found with id of ${invoiceId}`, 404);
    }
    
    if (invoice.status === 'paid') {
      throw new ApiError('This invoice has already been paid', 400);
    }
    
    // Create PayPal client
    const paypalClient = getPayPalClient();
    
    // Create order request
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: invoice.total.toFixed(2)
        },
        description: `Invoice #${invoice.invoiceNumber}`,
        custom_id: invoice._id.toString(),
        invoice_id: invoice.invoiceNumber
      }],
      application_context: {
        brand_name: 'Your Company Name',
        shipping_preference: 'NO_SHIPPING'
      }
    });
    
    // Call PayPal API
    const order = await paypalClient.execute(request);
    
    res.status(200).json({
      success: true,
      data: {
        id: order.result.id
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Capture PayPal payment
 * @route   POST /api/payments/paypal/capture-payment
 * @access  Public
 */
exports.capturePayPalPayment = async (req, res, next) => {
  try {
    const { orderId, invoiceId } = req.body;
    
    if (!orderId || !invoiceId) {
      throw new ApiError('Order ID and Invoice ID are required', 400);
    }
    
    // Find invoice
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      throw new ApiError(`Invoice not found with id of ${invoiceId}`, 404);
    }
    
    // Create PayPal client
    const paypalClient = getPayPalClient();
    
    // Capture payment
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.prefer('return=representation');
    const response = await paypalClient.execute(request);
    
    const captureId = response.result.purchase_units[0].payments.captures[0].id;
    
    // Create payment record
    const payment = await Payment.create({
      invoiceId: invoice._id,
      method: 'paypal',
      transactionId: captureId,
      amount: invoice.total,
      status: 'success',
      metadata: {
        paypalOrderId: orderId
      }
    });
    
    // Update invoice status
    invoice.status = 'paid';
    invoice.paymentMethod = 'paypal';
    invoice.transactionId = captureId;
    await invoice.save();
    
    // Send confirmation email
    await emailService.sendPaymentConfirmationEmail(invoice);
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment status for an invoice
 * @route   GET /api/payments/status/:invoiceId
 * @access  Public
 */
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    
    // Find invoice
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      throw new ApiError(`Invoice not found with id of ${invoiceId}`, 404);
    }
    
    // Find payment record
    const payment = await Payment.findOne({ invoiceId: invoiceId }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: {
        invoiceStatus: invoice.status,
        payment: payment || null
      }
    });
  } catch (error) {
    next(error);
  }
};
