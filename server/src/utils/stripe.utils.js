const stripe = require('stripe')(require('../config/env').stripe.secretKey);

/**
 * Create a Stripe payment intent
 * @param {Number} amount Amount in dollars (will be converted to cents for Stripe)
 * @param {Object} metadata Additional metadata to include with the payment intent
 * @returns {Promise<Object>} Stripe payment intent object
 */
exports.createPaymentIntent = async (amount, metadata = {}) => {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    metadata
  });
};

/**
 * Retrieve a payment intent by ID
 * @param {String} paymentIntentId Stripe payment intent ID
 * @returns {Promise<Object>} Stripe payment intent object
 */
exports.retrievePaymentIntent = async (paymentIntentId) => {
  return stripe.paymentIntents.retrieve(paymentIntentId);
};

/**
 * Confirm a payment intent
 * @param {String} paymentIntentId Stripe payment intent ID
 * @returns {Promise<Object>} Stripe payment intent object
 */
exports.confirmPaymentIntent = async (paymentIntentId) => {
  return stripe.paymentIntents.confirm(paymentIntentId);
};

/**
 * Cancel a payment intent
 * @param {String} paymentIntentId Stripe payment intent ID
 * @returns {Promise<Object>} Stripe payment intent object
 */
exports.cancelPaymentIntent = async (paymentIntentId) => {
  return stripe.paymentIntents.cancel(paymentIntentId);
};

/**
 * Construct a Stripe webhook event
 * @param {Buffer} payload Raw request body
 * @param {String} signature Stripe signature from headers
 * @param {String} webhookSecret Stripe webhook secret from config
 * @returns {Object} Stripe event object
 */
exports.constructWebhookEvent = (payload, signature, webhookSecret) => {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};
