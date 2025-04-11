import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'react-toastify';
import { format, parseISO, isValid } from 'date-fns';
import { Invoice, InvoiceItem } from '../../services/invoiceService';
import Layout from '../../components/layout/Layout';
import { getInvoiceByNumber } from '../../services/invoiceService';
import { getPaymentMethods } from '../../services/paymentService';
import StripePayment from '../../components/payment/StripePayment';
import { formatSafeDate } from '../../utils/dateUtils';

const InvoiceDetail: NextPage = () => {
  const router = useRouter();
  const { invoiceNumber } = router.query;
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<{id: string, name: string}[]>([]);

  // Placeholder function for successful payment
  const handlePaymentSuccess = () => {
    toast.success('Payment Successful!');
    // Refetch or update invoice status locally
    setInvoice(prev => prev ? { ...prev, status: 'paid' } : null);
    // Optionally, navigate or show a confirmation
  };

  // Helper to validate invoice data
  const validateInvoice = (invoice: Invoice): Invoice => {
    const validatedInvoice = { ...invoice };
    
    // Ensure status is valid
    if (!validatedInvoice.status || !['paid', 'unpaid', 'overdue'].includes(validatedInvoice.status)) {
      validatedInvoice.status = 'unpaid';
    }
    
    // Ensure items is an array
    if (!validatedInvoice.items || !Array.isArray(validatedInvoice.items)) {
      validatedInvoice.items = [];
    }
    
    // Ensure numeric fields are valid
    if (typeof validatedInvoice.subtotal !== 'number' || isNaN(validatedInvoice.subtotal)) {
      validatedInvoice.subtotal = 0;
    }
    
    if (typeof validatedInvoice.tax !== 'number' || isNaN(validatedInvoice.tax)) {
      validatedInvoice.tax = 0;
    }
    
    if (typeof validatedInvoice.total !== 'number' || isNaN(validatedInvoice.total)) {
      validatedInvoice.total = 0;
    }
    
    return validatedInvoice;
  };
  
  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceNumber) return;
      
      try {
        setLoading(true);
        const response = await getInvoiceByNumber(invoiceNumber as string);
        
        // Validate the invoice data before setting it
        setInvoice(validateInvoice(response.data));
        
        // Load available payment methods and filter out PayPal
        const methodsResponse = await getPaymentMethods();
        const filteredMethods = methodsResponse.data.filter(method => method.name !== 'paypal');
        setAvailablePaymentMethods(filteredMethods);

        if (filteredMethods.length > 0) {
          setSelectedPaymentMethod(filteredMethods[0].id);
        } else {
          setSelectedPaymentMethod(''); // No valid method available
          // Maybe show a message if needed
        }
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Invoice not found or cannot be accessed');
        toast.error('Error loading invoice details');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceNumber]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </Layout>
    );
  }

  if (error || !invoice) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="card max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="mb-6">{error || 'Failed to load invoice details'}</p>
            <button 
              onClick={() => router.push('/invoices/view')}
              className="btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Invoice {invoice.invoiceNumber} | Invoice System</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="card max-w-4xl mx-auto mb-8 print:shadow-none print:border-none">
          {/* Invoice Status Banner */}
          <div className={`mb-6 py-2 px-4 rounded-md text-white text-center font-medium ${
            invoice?.status === 'paid' 
              ? 'bg-green-500' 
              : invoice?.status === 'overdue' 
                ? 'bg-red-500' 
                : 'bg-yellow-500'
          }`}>
            Status: {invoice?.status ? `${invoice.status.charAt(0).toUpperCase()}${invoice.status.slice(1)}` : 'Unknown'}
          </div>
          
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
              <p className="text-gray-600">#{invoice?.invoiceNumber || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900">Your Company Name</p>
              <p className="text-gray-600">123 Business Street</p>
              <p className="text-gray-600">City, ST 12345</p>
              <p className="text-gray-600">contact@example.com</p>
            </div>
          </div>
          
          {/* Client Information & Dates */}
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div>
              <h2 className="text-gray-700 font-medium mb-2">Bill To:</h2>
              <p className="font-medium">{invoice?.clientName || 'N/A'}</p>
              <p className="text-gray-600">{invoice?.clientEmail || 'N/A'}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="flex justify-between space-x-4 text-sm">
                <div>
                  <p className="text-gray-700 font-medium">Issue Date:</p>
                  <p className="text-gray-700 font-medium mt-2">Due Date:</p>
                </div>
                <div className="text-right">
                  <p>{formatSafeDate(invoice.createdAt)}</p>
                  <p className="mt-2">{formatSafeDate(invoice.dueDate)}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Invoice Items */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 text-left font-medium text-gray-700">Description</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-700">Quantity</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-700">Price</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice?.items?.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-4">{item.description}</td>
                    <td className="py-3 px-4 text-right">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">${item.price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">${(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-center">No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Invoice Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-full md:w-1/2">
              <div className="flex justify-between py-2">
                <span className="text-gray-700">Subtotal</span>
                <span className="font-medium">${invoice?.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-700">Tax</span>
                <span className="font-medium">${invoice?.tax?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-300 mt-2 pt-2">
                <span>Total</span>
                <span>${invoice?.total?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
          
          {/* Notes */}
          <div className="mb-8">
            <h3 className="font-medium text-gray-700 mb-2">Notes</h3>
            <p className="text-gray-600">Thank you for your business! Payment is due within {
              (() => {
                try {
                  const dueDate = parseISO(invoice.dueDate);
                  const createdDate = invoice.createdAt ? parseISO(invoice.createdAt) : new Date();
                  
                  if (isValid(dueDate) && isValid(createdDate) && dueDate.getTime() > createdDate.getTime()) {
                    return Math.ceil((dueDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                  }
                  return 30;
                } catch {
                  return 30;
                }
              })()
            } days.</p>
          </div>
        </div>
        
        {/* Payment Processing Section - Conditionally rendered if invoice is unpaid */}
        {invoice.status !== 'paid' && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg print:hidden">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Pay Invoice</h2>
            {/* Payment Method Selection - Filtered */}
            <div className="mb-6">
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                Select Payment Method
              </label>
              <select
                id="paymentMethod"
                className="form-input"
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                disabled={availablePaymentMethods.length === 0}
              >
                {availablePaymentMethods.length > 0 ? (
                  availablePaymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name === 'stripe' ? 'Credit Card (Stripe)' : 'Other Method'}
                    </option>
                  ))
                ) : (
                   <option disabled value="">No payment methods available</option>
                )}
              </select>
            </div>
            
            {/* Payment Component - Only Stripe, if invoice ID exists */}
            {invoice._id && (
              <div className="mb-6">
                {selectedPaymentMethod === 'stripe' ? (
                  <StripePayment 
                    invoiceId={invoice._id} 
                    amount={invoice.total}
                    onPaymentSuccess={handlePaymentSuccess}
                  />
                ) : availablePaymentMethods.length === 0 ? (
                  <div className="text-center p-4 bg-gray-100 rounded">No payment methods configured.</div>
                ) : (
                  <div className="text-center p-4 bg-gray-100 rounded">Select a payment method.</div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="max-w-4xl mx-auto mt-8 flex justify-center space-x-4 print:hidden">
          <button onClick={handlePrint} className="btn-secondary">
            Print Invoice
          </button>
          <button onClick={() => router.push('/invoices/view')} className="btn-primary">
            Back to Invoice Search
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default InvoiceDetail;
