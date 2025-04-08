const express = require('express');
const router = express.Router();
const {
  getPaymentMethods,
  createStripePaymentIntent,
  stripeWebhook,
  createPayPalOrder,
  capturePayPalPayment,
  getPaymentStatus
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/methods', getPaymentMethods);
router.get('/status/:invoiceId', getPaymentStatus);

// Stripe routes
router.post('/stripe/create-intent', protect, createStripePaymentIntent);

// Special route for Stripe webhooks - needs raw body
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// PayPal routes
router.post('/paypal/create-order', protect, createPayPalOrder);
router.post('/paypal/capture-payment', protect, capturePayPalPayment);

module.exports = router;
