const stripe = require('stripe')(require('../config/env').stripe.secretKey);
const paypal = require('@paypal/checkout-server-sdk');
const config = require('../config/env');
const { Invoice } = require('../models/invoice.model');
const { Payment } = require('../models/payment.model');
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
      methods.push({ id: 'stripe', name: 'Credit Card (Stripe)' });
    }
    
    if (config.paypal.clientId && config.paypal.clientSecret) {
      methods.push({ id: 'paypal', name: 'PayPal' });
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

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new ApiError('Invoice not found', 404);
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      throw new ApiError('Invoice is already paid', 400);
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.total * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        invoiceId,
        invoiceNumber: invoice.invoice_number
      }
    });

    // Create payment record
    await Payment.create({
      user_id: invoice.user_id,
      invoice_id: invoice.id,
      amount: invoice.total,
      payment_method: 'stripe',
      status: 'pending',
      payment_intent_id: paymentIntent.id
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret
      }
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
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        config.stripe.webhookSecret
      );
    } catch (err) {
      throw new ApiError(`Webhook Error: ${err.message}`, 400);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Update payment record
        const payment = await Payment.findOne({
          payment_intent_id: paymentIntent.id
        });
        
        if (payment) {
          await Payment.update(payment.id, {
            status: 'completed',
            transaction_id: paymentIntent.id
          });

          // Update invoice status
          await Invoice.updateStatus(payment.invoice_id, 'paid');

          // Get updated invoice
          const invoice = await Invoice.findById(payment.invoice_id);

          // Send confirmation email
          try {
            await emailService.sendPaymentConfirmation(invoice);
          } catch (emailError) {
            console.error('Failed to send payment confirmation email:', emailError);
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        
        // Update payment record
        await Payment.update({
          payment_intent_id: failedPaymentIntent.id
        }, {
          status: 'failed',
          error: failedPaymentIntent.last_payment_error?.message
        });
        break;
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

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new ApiError('Invoice not found', 404);
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      throw new ApiError('Invoice is already paid', 400);
    }

    // Create PayPal order
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: invoice.total.toString()
        },
        custom_id: invoice.id,
        description: `Payment for invoice #${invoice.invoice_number}`
      }]
    });

    const order = await getPayPalClient().execute(request);

    // Create payment record
    await Payment.create({
      user_id: invoice.user_id,
      invoice_id: invoice.id,
      amount: invoice.total,
      payment_method: 'paypal',
      status: 'pending',
      payment_intent_id: order.result.id
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.result.id
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
    const { orderId } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    
    const capture = await getPayPalClient().execute(request);

    if (capture.result.status === 'COMPLETED') {
      const payment = await Payment.findOne({
        payment_intent_id: orderId
      });

      if (payment) {
        // Update payment record
        await Payment.update(payment.id, {
          status: 'completed',
          transaction_id: capture.result.id
        });

        // Update invoice status
        await Invoice.updateStatus(payment.invoice_id, 'paid');

        // Get updated invoice
        const invoice = await Invoice.findById(payment.invoice_id);

        // Send confirmation email
        try {
          await emailService.sendPaymentConfirmation(invoice);
        } catch (emailError) {
          console.error('Failed to send payment confirmation email:', emailError);
        }
      }
    }

    res.status(200).json({
      success: true,
      data: capture.result
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
    const payments = await Payment.findByInvoiceId(req.params.invoiceId);
    
    const latestPayment = payments[0];
    
    res.status(200).json({
      success: true,
      data: {
        status: latestPayment?.status || 'no_payment',
        paymentMethod: latestPayment?.payment_method,
        lastUpdated: latestPayment?.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
};
