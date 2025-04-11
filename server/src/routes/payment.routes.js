const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createStripePaymentIntent,
  stripeWebhook
} = require('../controllers/payment.controller');

// Stripe routes
router.post('/stripe/create-payment-intent', protect, createStripePaymentIntent);
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;
