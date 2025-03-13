const paypal = require('@paypal/checkout-server-sdk');
const config = require('../config/env');

/**
 * Create a PayPal client
 * @returns {paypal.core.PayPalHttpClient} PayPal HTTP client
 */
exports.createPayPalClient = () => {
  const environment = config.paypal.mode === 'live'
    ? new paypal.core.LiveEnvironment(
        config.paypal.clientId,
        config.paypal.clientSecret
      )
    : new paypal.core.SandboxEnvironment(
        config.paypal.clientId,
        config.paypal.clientSecret
      );
  
  return new paypal.core.PayPalHttpClient(environment);
};

/**
 * Create a PayPal order
 * @param {Number} amount Amount to charge
 * @param {String} invoiceId ID of the related invoice
 * @param {String} invoiceNumber Human-readable invoice number
 * @returns {Promise<Object>} PayPal order
 */
exports.createOrder = async (amount, invoiceId, invoiceNumber) => {
  const client = exports.createPayPalClient();
  
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: amount.toFixed(2)
      },
      description: `Invoice #${invoiceNumber}`,
      custom_id: invoiceId,
      invoice_id: invoiceNumber
    }],
    application_context: {
      brand_name: 'Your Company Name',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW'
    }
  });
  
  const response = await client.execute(request);
  return response.result;
};

/**
 * Capture a PayPal payment
 * @param {String} orderId PayPal order ID to capture
 * @returns {Promise<Object>} PayPal capture response
 */
exports.capturePayment = async (orderId) => {
  const client = exports.createPayPalClient();
  
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.prefer('return=representation');
  
  const response = await client.execute(request);
  return response.result;
};

/**
 * Get details for a PayPal order
 * @param {String} orderId PayPal order ID to get details for
 * @returns {Promise<Object>} PayPal order details
 */
exports.getOrderDetails = async (orderId) => {
  const client = exports.createPayPalClient();
  
  const request = new paypal.orders.OrdersGetRequest(orderId);
  const response = await client.execute(request);
  
  return response.result;
};
