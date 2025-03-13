import api from './api';

export interface PaymentMethod {
  id: string;
  name: 'stripe' | 'paypal';
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  status: string;
}

export interface PaymentRecord {
  _id?: string;
  invoiceId: string;
  method: 'stripe' | 'paypal';
  transactionId: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  createdAt?: string;
}

// Create a payment intent for Stripe
export const createStripePaymentIntent = (invoiceId: string) => {
  return api.post<PaymentIntent>('/api/payments/stripe/create-intent', { invoiceId });
};

// Create a PayPal order
export const createPayPalOrder = (invoiceId: string) => {
  return api.post<{ id: string }>('/api/payments/paypal/create-order', { invoiceId });
};

// Capture a PayPal payment
export const capturePayPalPayment = (orderId: string, invoiceId: string) => {
  return api.post<PaymentRecord>('/api/payments/paypal/capture-payment', { orderId, invoiceId });
};

// Confirm Stripe payment (webhook usually handles this, but added for completeness)
export const confirmStripePayment = (paymentIntentId: string, invoiceId: string) => {
  return api.post<PaymentRecord>('/api/payments/stripe/confirm', { paymentIntentId, invoiceId });
};

// Get payment status for an invoice
export const getPaymentStatus = (invoiceId: string) => {
  return api.get<PaymentRecord>(`/api/payments/status/${invoiceId}`);
};

// Get payment methods available
export const getPaymentMethods = () => {
  return api.get<PaymentMethod[]>('/api/payments/methods');
};
