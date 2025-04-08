import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
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

// New CheckoutForm component
const CheckoutForm: React.FC<{ clientSecret: string, onPaymentSuccess: () => void }> = ({ clientSecret, onPaymentSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: `${window.location.origin}/payment-success?invoiceId=${/* How to get invoiceId here? Need to pass it down */ ''}`, // Placeholder for invoiceId
      },
      // We redirect to the return_url for success automatically
      // redirect: 'if_required' // Use this if you want to handle success manually without redirect
    });

    if (error) {
      // This point will only be reached if there is an immediate error when
      // confirming the payment. Otherwise, your customer will be redirected to
      // your `return_url`. For some payment methods like iDEAL, your customer will
      // be redirected to an intermediate site first to authorize the payment, then
      // redirected to the `return_url`.
      setMessage(error.message || 'An unexpected error occurred.');
      toast.error(error.message || 'Payment failed.');
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
       // This block is usually not reached because of the redirect
       // If using redirect: 'if_required', handle success here
       setMessage('Payment succeeded!');
       toast.success('Payment successful!');
       onPaymentSuccess(); // Notify parent component
    }


    setIsProcessing(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" className="mb-4" />
      <button disabled={isProcessing || !stripe || !elements} id="submit" className="btn-primary w-full">
        <span id="button-text">
          {isProcessing ? "Processing…" : "Pay now"}
        </span>
      </button>
      {/* Show any error or success messages */}
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
          <CheckoutForm clientSecret={clientSecret} onPaymentSuccess={onPaymentSuccess} />
        </Elements>
      )}
    </div>
  );
};

export default StripePayment;
