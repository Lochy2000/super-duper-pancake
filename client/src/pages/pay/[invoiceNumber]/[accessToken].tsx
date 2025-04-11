import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from '../../../components/layout/Layout';
import { Invoice } from '../../../services/invoiceService';
import { getPaymentMethods } from '../../../services/paymentService';
import { getInvoiceForPayment } from '../../../services/invoiceService';
import StripePayment from '../../../components/payment/StripePayment';
import { formatSafeDate } from '../../../utils/dateUtils';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePaymentForm from '../../../components/payment/StripePaymentForm';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const SecurePaymentPage: NextPage = () => {
  const router = useRouter();
  const { invoiceNumber, accessToken } = router.query;
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isValidAccess, setIsValidAccess] = useState<boolean | null>(null); // null: loading, true: valid, false: invalid
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<{id: string, name: string}[]>([]);
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!router.isReady || !invoiceNumber || !accessToken) return;

      try {
        const response = await fetch(`/api/invoices/public/${invoiceNumber}/${accessToken}`);
        if (!response.ok) {
          throw new Error('Failed to fetch invoice');
        }
        const data = await response.json();
        setInvoice(data);
        setIsValidAccess(true);

        // Create payment intent
        const paymentResponse = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invoiceNumber: data.invoiceNumber,
            amount: data.total,
            accessToken: accessToken,
          }),
        });

        if (!paymentResponse.ok) {
          throw new Error('Failed to create payment intent');
        }

        const { clientSecret } = await paymentResponse.json();
        setClientSecret(clientSecret);
      } catch (err) {
        console.error('Error:', err);
        setIsValidAccess(false);
        setError('Invalid or expired access token');
      }
    };

    fetchInvoice();
  }, [invoiceNumber, accessToken, router.isReady]);

  // Handle successful payment
  const handlePaymentSuccess = async () => {
    toast.success('Payment successful!');
    // Refresh the invoice data to show updated status
    if (invoiceNumber && accessToken) {
      try {
        const response = await fetch(`/api/invoices/public/${invoiceNumber}/${accessToken}`);
        if (response.ok) {
          const updatedInvoice = await response.json();
          setInvoice(updatedInvoice);
        }
      } catch (err) {
        console.error('Error refreshing invoice:', err);
      }
    }
  };

  // --- Render different states --- 

  if (!router.isReady || isValidAccess === null) { // Loading state
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </Layout>
    );
  }

  if (isValidAccess === false || !invoice) { // Error or invalid access state
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="card max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="mb-6">{error || 'The payment link is invalid or has expired.'}</p>
            {/* Optional: Add link to contact support or request new link */}
          </div>
        </div>
      </Layout>
    );
  }

  // --- Render Invoice & Payment Options (if access is valid) ---
  
  // Check if invoice is already paid
  if (invoice.status === 'paid') {
      return (
        <Layout>
            <div className="container mx-auto px-4 py-16 text-center">
                <div className="card max-w-lg mx-auto bg-green-50 text-green-700">
                    <h1 className="text-2xl font-bold text-green-600 mb-4">Invoice Already Paid</h1>
                    <p>Invoice #{invoice.invoiceNumber} has already been paid.</p>
                    {/* Optional: Link to client portal if they log in */}
                </div>
            </div>
        </Layout>
      );
  }

  return (
    <Layout>
      <Head>
        <title>Pay Invoice {invoice.invoiceNumber} | Invoice System</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Invoice #{invoice.invoiceNumber}</h1>
          
          {/* Invoice Details */}
          <div className="card mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Bill To:</h3>
                <p>{invoice.clientName}</p>
                <p>{invoice.clientEmail}</p>
              </div>
              <div className="text-right">
                <p><span className="font-semibold">Due Date:</span> {new Date(invoice.dueDate).toLocaleDateString()}</p>
                <p><span className="font-semibold">Amount Due:</span> ${invoice.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="card mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Quantity</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{item.description}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">${item.price.toFixed(2)}</td>
                    <td className="text-right py-2">${(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right py-2 font-semibold">Subtotal:</td>
                  <td className="text-right py-2">${invoice.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right py-2 font-semibold">Tax:</td>
                  <td className="text-right py-2">${invoice.tax.toFixed(2)}</td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={3} className="text-right py-2">Total:</td>
                  <td className="text-right py-2">${invoice.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Section */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-6">Payment</h2>
            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripePaymentForm 
                  amount={invoice.total} 
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading payment form...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SecurePaymentPage; 