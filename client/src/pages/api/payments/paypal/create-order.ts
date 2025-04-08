import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
// Note: PayPal SDK will need to be installed via npm: npm install @paypal/checkout-server-sdk

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

    // Get authenticated user ID
    let userId;
    try {
      userId = await getUserId(req);
    } catch (error: any) {
      return res.status(401).json({ error: error.message || 'Authentication failed' });
    }

    // Fetch the invoice to get the amount and check ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, user_id, amount, currency, invoice_number, status')
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

    // Don't allow payment if already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    // For now, return a mock PayPal order ID
    // In a real implementation, this would use the PayPal SDK to create an order
    // Reference implementation would be:
    /*
    const paypal = require('@paypal/checkout-server-sdk');
    
    // This would be in a separate helper file
    function getPayPalClient() {
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_SECRET;
      const environment = process.env.PAYPAL_ENVIRONMENT === 'production'
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret);
      return new paypal.core.PayPalHttpClient(environment);
    }
    
    const paypalClient = getPayPalClient();
    
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: invoice.currency || 'USD',
          value: invoice.amount.toString()
        },
        reference_id: invoice.id,
        description: `Payment for Invoice #${invoice.invoice_number}`
      }]
    });
    
    const order = await paypalClient.execute(request);
    const orderId = order.result.id;
    */
    
    // For the mock implementation:
    const mockOrderId = `MOCK_PAYPAL_ORDER_${Date.now()}_${invoiceId}`;

    // Create a record in the payments table
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        invoice_id: invoiceId,
        amount: invoice.amount,
        currency: invoice.currency || 'usd',
        payment_method: 'paypal',
        payment_status: 'pending',
        transaction_id: mockOrderId, // In real implementation this would be the PayPal order ID
        payment_date: null, // Will be updated when payment is captured
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      // Continue since we have the mock order ID
    }

    // Return the order ID
    return res.status(200).json({ id: mockOrderId });
  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 