import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for server operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
}

const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: {
      persistSession: false,
    }
  }
);

// Helper to transform payment data
const transformPaymentData = (payment: any) => {
  return {
    _id: payment.id,
    invoiceId: payment.invoice_id,
    provider: payment.provider,
    amount: payment.amount,
    status: payment.status,
    providerPaymentId: payment.provider_payment_id,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get invoice number from query parameters
    const invoiceNumber = req.query.invoiceNumber as string;
    if (!invoiceNumber) {
      return res.status(400).json({ error: 'Invoice number is required' });
    }

    // First, get the invoice ID from the invoice number
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('invoice_number', invoiceNumber)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') { // Record not found
        return res.status(404).json({ error: 'Invoice not found' });
      }
      console.error('Error fetching invoice:', invoiceError);
      return res.status(500).json({ error: 'Failed to fetch invoice' });
    }

    // If the invoice is already marked as paid, return that status
    if (invoice.status === 'paid') {
      return res.status(200).json({
        invoiceNumber,
        status: 'paid',
        message: 'Invoice has been paid'
      });
    }

    // Get the latest payment for this invoice
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error('Error fetching payment:', paymentError);
      return res.status(500).json({ error: 'Failed to fetch payment status' });
    }

    // If no payment found
    if (!payment) {
      return res.status(200).json({
        invoiceNumber,
        status: 'pending',
        message: 'No payment found for this invoice'
      });
    }

    // Return the payment status
    const transformedPayment = transformPaymentData(payment);
    return res.status(200).json({
      ...transformedPayment,
      invoiceNumber
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 