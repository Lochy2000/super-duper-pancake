import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia'
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoiceNumber, amount, accessToken } = req.body;

    if (!invoiceNumber || !amount || !accessToken) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify invoice and access token
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .eq('access_token', accessToken)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found or access denied' });
    }

    // Check if access token has expired
    const tokenExpiresAt = new Date(invoice.token_expires_at);
    const now = new Date();
    if (tokenExpiresAt < now) {
      return res.status(401).json({ error: 'Access token has expired' });
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        invoiceNumber,
        invoiceId: invoice.id
      }
    });

    // Return the client secret
    res.status(200).json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (err: any) {
    console.error('Error creating payment intent:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment intent' });
  }
} 