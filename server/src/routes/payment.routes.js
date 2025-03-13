const express = require('express');
const router = express.Router();
const {
  getPaymentMethods,
  createStripePaymentIntent,
  confirmStripePayment,
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
router.post('/stripe/create-intent', createStripePaymentIntent);
router.post('/stripe/confirm', confirmStripePayment);

// Special route for Stripe webhooks - needs raw body
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// PayPal routes
router.post('/paypal/create-order', createPayPalOrder);
router.post('/paypal/capture-payment', capturePayPalPayment);

module.exports = router;
