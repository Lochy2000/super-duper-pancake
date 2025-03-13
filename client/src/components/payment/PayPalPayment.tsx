import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { toast } from 'react-toastify';
import { createPayPalOrder, capturePayPalPayment } from '../../services/paymentService';

interface PayPalPaymentProps {
  invoiceId: string;
  amount: number;
}

const PayPalPayment: React.FC<PayPalPaymentProps> = ({ invoiceId, amount }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  
  const resetPayment = () => {
    setError(null);
    setPaymentStatus('idle');
  };

  // Get PayPal client ID from env vars
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  if (!paypalClientId) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-md">
        PayPal client ID not configured. Please contact support.
      </div>
    );
  }

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
          Complete your payment securely with PayPal.
        </p>
      </div>
      
      {paymentStatus === 'success' ? (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
          <p className="font-medium">Payment Successful!</p>
          <p>Your payment is being processed.</p>
          <p className="text-sm mt-2">The page will refresh shortly to show updated status.</p>
        </div>
      ) : (
        <PayPalScriptProvider options={{ 'client-id': paypalClientId }}>
          <PayPalButtons
            disabled={loading || paymentStatus === 'processing'}
            createOrder={async () => {
              try {
                setLoading(true);
                setError(null);
                setPaymentStatus('processing');
                
                const response = await createPayPalOrder(invoiceId);
                return response.data.id;
              } catch (err: any) {
                console.error('Error creating PayPal order:', err);
                setError(err.message || 'Failed to create PayPal order');
                setPaymentStatus('error');
                toast.error('Payment setup failed');
                throw err;
              } finally {
                setLoading(false);
              }
            }}
            onApprove={async (data) => {
              try {
                setLoading(true);
                setPaymentStatus('processing');
                
                // Capture the approved payment
                await capturePayPalPayment(data.orderID, invoiceId);
                
                // Show success message
                setPaymentStatus('success');
                toast.success('Payment completed successfully!');
                
                // Reload the page to show updated status after a short delay
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              } catch (err: any) {
                console.error('Error capturing PayPal payment:', err);
                setError(err.message || 'Failed to complete payment');
                setPaymentStatus('error');
                toast.error('Payment processing failed');
              } finally {
                setLoading(false);
              }
            }}
            onError={(err) => {
              console.error('PayPal error:', err);
              setError('PayPal payment failed');
              setPaymentStatus('error');
              toast.error('Payment processing failed');
            }}
            style={{ layout: 'vertical' }}
          />
        </PayPalScriptProvider>
      )}
    </div>
  );
};

export default PayPalPayment;
