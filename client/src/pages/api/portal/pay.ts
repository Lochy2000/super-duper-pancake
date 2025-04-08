import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('Missing Stripe Secret Key');
}
const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2025-02-24.acacia', // Latest version
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get invoice information from request body
    const { invoiceNumber, paymentMethod } = req.body;
    
    if (!invoiceNumber) {
      return res.status(400).json({ error: 'Invoice number is required' });
    }
    
    if (!paymentMethod || !['stripe', 'paypal'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Valid payment method is required' });
    }

    // Find the invoice by invoice number
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, user_id, amount, currency, invoice_number, status')
      .eq('invoice_number', invoiceNumber)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') { // Record not found
        return res.status(404).json({ error: 'Invoice not found' });
      }
      console.error('Error fetching invoice:', invoiceError);
      return res.status(500).json({ error: 'Failed to fetch invoice details' });
    }

    // Don't allow payment if already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    // Handle different payment methods
    if (paymentMethod === 'stripe') {
      // Convert amount to smallest currency unit (cents for USD, etc.)
      const amount = Math.round(parseFloat(invoice.amount) * 100);
      
      // Create a payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: invoice.currency || 'USD',
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number
        }
      });
      
      // Record the payment attempt in our database
      await supabase
        .from('payments')
        .insert([{
          invoice_id: invoice.id,
          user_id: invoice.user_id,
          provider: 'stripe',
          amount: invoice.amount,
          currency: invoice.currency || 'USD',
          status: 'pending',
          provider_payment_id: paymentIntent.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      
      // Return the client secret to the client
      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } 
    else if (paymentMethod === 'paypal') {
      // PayPal payment would be implemented similarly
      // For now, return a placeholder response
      return res.status(200).json({
        redirectUrl: `/api/portal/paypal/create-order?invoiceNumber=${invoiceNumber}`,
        message: 'Redirect to PayPal payment flow'
      });
    }
    
    // Should never reach here due to validation above
    return res.status(400).json({ error: 'Invalid payment method' });
  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 