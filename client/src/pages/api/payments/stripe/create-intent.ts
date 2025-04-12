import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('Missing Stripe Secret Key');
}
const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2025-03-31.basil',
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

// Get user ID from request - REMOVING THIS FOR NOW TO SIMPLIFY CLIENT PAYMENT
/*
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
*/

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get invoice ID from request body
    const { invoiceId } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    // Fetch the invoice directly by ID without user auth check for this test
    console.log(`[create-intent] Fetching invoice for ID: ${invoiceId}`);
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      // Select necessary fields + user_id for metadata
      .select('id, user_id, amount, currency, invoice_number, status') 
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') { // Record not found
        console.error(`[create-intent] Invoice not found: ${invoiceId}`);
        return res.status(404).json({ error: 'Invoice not found' });
      }
      console.error('[create-intent] Error fetching invoice:', invoiceError);
      return res.status(500).json({ error: 'Failed to fetch invoice details' });
    }
    console.log(`[create-intent] Found invoice: ${invoice.invoice_number}, Status: ${invoice.status}`);

    // REMOVED: Verify the invoice belongs to the authenticated user
    /*
    let userId;
    try {
      userId = await getUserId(req);
    } catch (error: any) {
      return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
    if (invoice.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this invoice' });
    }
    */
    const userIdForMetadata = invoice.user_id; // Get user_id from the fetched invoice for metadata

    // Don't allow payment if already paid
    if (invoice.status === 'paid') {
      console.warn(`[create-intent] Attempt to pay already paid invoice: ${invoiceId}`);
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    // Convert amount to smallest currency unit (cents for USD, etc.)
    const amount = Math.round(parseFloat(invoice.amount) * 100);
    console.log(`[create-intent] Amount in cents: ${amount}`);

    // Create a payment intent with Stripe
    console.log(`[create-intent] Creating Stripe Payment Intent with metadata including invoiceId: ${invoice.id}`);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: invoice.currency || 'usd',
      metadata: {
        invoiceId: invoice.id, // Crucial for webhook
        invoiceNumber: invoice.invoice_number,
        userId: userIdForMetadata // Include original user ID if needed
      }
    });
    console.log(`[create-intent] Payment Intent created: ${paymentIntent.id}`);

    // Create a record in the payments table
    console.log(`[create-intent] Creating pending payment record for PI: ${paymentIntent.id}`);
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        invoice_id: invoiceId,
        amount: invoice.amount,
        currency: invoice.currency || 'usd',
        payment_method: 'stripe',
        payment_status: 'pending',
        transaction_id: paymentIntent.id,
        payment_date: null, // Will be updated when payment is completed
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('[create-intent] Error creating payment record:', paymentError);
      // Decide if this should be a fatal error
    } else {
      console.log(`[create-intent] Pending payment record created: ${payment?.id}`);
    }

    // Return the payment intent details to the client
    console.log(`[create-intent] Returning clientSecret to frontend.`);
    return res.status(200).json({
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: amount / 100, // Convert back to decimal for the client
      status: paymentIntent.status
    });
  } catch (error: any) {
    console.error('[create-intent] General Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 