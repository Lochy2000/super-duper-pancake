import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-toastify';
import { createStripePaymentIntent } from '../../services/paymentService';

interface StripePaymentProps {
  invoiceId: string;
  amount: number;
}

const StripePayment: React.FC<StripePaymentProps> = ({ invoiceId, amount }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      setPaymentStatus('processing');
      
      // Get the publishable key from env vars
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error('Stripe publishable key not found');
      }
      
      // Load Stripe
      const stripe = await loadStripe(publishableKey);
      if (!stripe) {
        throw new Error('Failed to initialize Stripe');
      }
      
      // Create a payment intent
      const response = await createStripePaymentIntent(invoiceId);
      const { clientSecret } = response.data;
      
      // Redirect to Stripe checkout
      const result = await stripe.redirectToCheckout({
        clientSecret
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      setPaymentStatus('success');
    } catch (err: any) {
      console.error('Stripe payment error:', err);
      setError(err.message || 'An error occurred during payment processing');
      setPaymentStatus('error');
      toast.error('Payment processing failed');
    } finally {
      setLoading(false);
    }
  };
  
  const resetPayment = () => {
    setError(null);
    setPaymentStatus('idle');
  };

  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          <p className="font-medium">Payment Error</p>
          <p>{error}</p>
          <button 
            onClick={resetPayment}
            className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 py-1 px-3 rounded"
          >
            Try Again
          </button>
        </div>
      )}
      
      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <p className="font-medium">Amount to Pay: ${amount.toFixed(2)}</p>
        <p className="text-sm text-gray-600 mt-2">
          You will be redirected to Stripe's secure payment page to complete your payment.
        </p>
      </div>
      
      {paymentStatus === 'success' ? (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
          <p className="font-medium">Payment Successful!</p>
          <p>Your payment is being processed.</p>
          <p className="text-sm mt-2">The page will refresh shortly to show updated status.</p>
        </div>
      ) : (
        <button
          onClick={handlePayment}
          disabled={loading || paymentStatus === 'processing'}
          className="btn-primary w-full flex justify-center items-center"
        >
          {loading || paymentStatus === 'processing' ? (
            <>
              <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
              Processing...
            </>
          ) : (
            'Pay with Credit Card'
          )}
        </button>
      )}
    </div>
  );
};

export default StripePayment;
