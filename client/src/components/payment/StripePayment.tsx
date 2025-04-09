import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, PaymentIntent } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';
import { createStripePaymentIntent } from '../../services/paymentService';

interface StripePaymentProps {
  invoiceId: string;
  amount: number;
  onPaymentSuccess: () => void; // Add callback for success
}

// Define stripePromise outside component to avoid recreating on render
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Define props for CheckoutForm including invoiceId
interface CheckoutFormProps {
  clientSecret: string;
  invoiceId: string; // Add invoiceId prop
  onPaymentSuccess: () => void;
}

// Update CheckoutForm component signature
const CheckoutForm: React.FC<CheckoutFormProps> = ({ clientSecret, invoiceId, onPaymentSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    // Use result object instead of destructuring immediately
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    // Check for error first
    if (result.error) {
      setMessage(result.error.message || 'An unexpected error occurred.');
      toast.error(result.error.message || 'Payment failed.');
      setIsProcessing(false); // Stop processing on error
    } else {
      // If no error, use 'in' operator and type assertion to safely access paymentIntent.status
      if ('paymentIntent' in result && result.paymentIntent) {
        // Assert the type of paymentIntent to access its properties
        const paymentIntent = result.paymentIntent as PaymentIntent;
        if (paymentIntent.status === 'succeeded') {
          // This block is usually only reached if redirect: 'if_required' is used,
          // as the browser typically redirects before this code runs.
          setMessage('Payment succeeded!');
          toast.success('Payment successful!');
          onPaymentSuccess();
        }
      }
      // No need to setIsProcessing(false) here if redirecting, but include for completeness
      setIsProcessing(false);
    }

    //setIsProcessing(false); // Moved inside the if/else blocks
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" className="mb-4" />
      <button disabled={isProcessing || !stripe || !elements} id="submit" className="btn-primary w-full">
        <span id="button-text">
          {isProcessing ? "Processing…" : "Pay now"}
        </span>
      </button>
      {message && <div id="payment-message" className="text-red-600 mt-2">{message}</div>}
    </form>
  );
};

const StripePayment: React.FC<StripePaymentProps> = ({ invoiceId, amount, onPaymentSuccess }) => {
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null); // State for client secret


  // Function to fetch the Payment Intent client secret
  const fetchPaymentIntent = async () => {
    try {
      setLoadingIntent(true);
      setError(null);
      setClientSecret(null); // Reset previous secret

      const response = await createStripePaymentIntent(invoiceId);
      if (response.data.clientSecret) {
        setClientSecret(response.data.clientSecret);
      } else {
        throw new Error('Failed to retrieve payment client secret.');
      }

    } catch (err: any) {
      console.error('Stripe payment intent error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred preparing payment';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingIntent(false);
    }
  };

  const resetPayment = () => {
    setError(null);
    setClientSecret(null); // Go back to the initial button state
  };

  // Options for the Elements provider
  const options = clientSecret ? { clientSecret } : undefined;

  if (!stripePromise) {
     return (
       <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
         Stripe configuration error: Publishable key not found. Please check your environment variables.
       </div>
     );
  }


  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          <p className="font-medium">Payment Setup Error</p>
          <p>{error}</p>
          <button
            onClick={resetPayment}
            className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 py-1 px-3 rounded"
          >
            Try Again
          </button>
        </div>
      )}

      {!clientSecret && (
        <>
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <p className="font-medium">Amount to Pay: ${amount.toFixed(2)}</p>
            <p className="text-sm text-gray-600 mt-2">
              Click below to securely pay with Stripe.
            </p>
          </div>
          <button
            onClick={fetchPaymentIntent}
            disabled={loadingIntent}
            className="btn-primary w-full flex justify-center items-center"
          >
            {loadingIntent ? (
              <>
                <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                Preparing Payment...
              </>
            ) : (
              'Pay with Credit Card'
            )}
          </button>
        </>
      )}

      {clientSecret && options && (
        <Elements options={options} stripe={stripePromise}>
          {/* Pass invoiceId down to CheckoutForm */}
          <CheckoutForm clientSecret={clientSecret} invoiceId={invoiceId} onPaymentSuccess={onPaymentSuccess} />
        </Elements>
      )}
    </div>
  );
};

export default StripePayment;
