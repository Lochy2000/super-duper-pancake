import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('Missing Stripe Secret Key');
}
const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2023-10-16', // Use the latest version or a specific version
});

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

// Get user ID from request
const getUserId = async (req: NextApiRequest) => {
  // Extract JWT from authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Verify the token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw error || new Error('User not found');
    }
    
    return user.id;
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw new Error('Authentication failed');
  }
};

// Helper to transform payment data to client format
const transformPaymentData = (payment: any) => {
  return {
    _id: payment.id,
    invoiceId: payment.invoice_id,
    method: payment.payment_method,
    transactionId: payment.transaction_id,
    amount: parseFloat(payment.amount || 0),
    status: payment.payment_status === 'completed' ? 'success' : 
            payment.payment_status === 'pending' ? 'pending' : 'failed',
    createdAt: payment.created_at
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get payment intent ID and invoice ID from request body
    const { paymentIntentId, invoiceId } = req.body;
    if (!paymentIntentId || !invoiceId) {
      return res.status(400).json({ 
        error: 'Payment Intent ID and Invoice ID are required' 
      });
    }

    // Get authenticated user ID
    let userId;
    try {
      userId = await getUserId(req);
    } catch (error: any) {
      return res.status(401).json({ error: error.message || 'Authentication failed' });
    }

    // Verify the invoice exists and belongs to the user
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, user_id, status')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') { // Record not found
        return res.status(404).json({ error: 'Invoice not found' });
      }
      console.error('Error fetching invoice:', invoiceError);
      return res.status(500).json({ error: 'Failed to fetch invoice details' });
    }

    // Verify the invoice belongs to the authenticated user
    if (invoice.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this invoice' });
    }

    // Don't allow confirmation if already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    // Retrieve the payment intent from Stripe to check its status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: `Payment is not complete. Status: ${paymentIntent.status}` 
      });
    }

    // Update the payment record in Supabase
    const { data: existingPayment, error: fetchPaymentError } = await supabase
      .from('payments')
      .select('id')
      .eq('transaction_id', paymentIntentId)
      .eq('invoice_id', invoiceId)
      .single();
      
    if (fetchPaymentError && fetchPaymentError.code !== 'PGRST116') {
      console.error('Error fetching payment record:', fetchPaymentError);
      return res.status(500).json({ error: 'Failed to fetch payment record' });
    }

    let payment;

    if (existingPayment) {
      // Update existing payment record
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          payment_date: new Date().toISOString()
        })
        .eq('id', existingPayment.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('Error updating payment record:', updateError);
        return res.status(500).json({ error: 'Failed to update payment record' });
      }
      
      payment = updatedPayment;
    } else {
      // Create a new payment record if one doesn't exist
      const { data: newPayment, error: insertError } = await supabase
        .from('payments')
        .insert([{
          invoice_id: invoiceId,
          amount: paymentIntent.amount / 100, // Convert from cents back to decimal
          currency: paymentIntent.currency,
          payment_method: 'stripe',
          payment_status: 'completed',
          transaction_id: paymentIntentId,
          payment_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (insertError) {
        console.error('Error creating payment record:', insertError);
        return res.status(500).json({ error: 'Failed to create payment record' });
      }
      
      payment = newPayment;
    }

    // Update the invoice status to paid
    const { error: updateInvoiceError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        payment_status: 'paid',
        paid_date: new Date().toISOString(),
        payment_method: 'stripe',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);
      
    if (updateInvoiceError) {
      console.error('Error updating invoice status:', updateInvoiceError);
      // Continue anyway because the payment was successful
    }

    // Return the payment record transformed to client format
    return res.status(200).json(transformPaymentData(payment));
  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 