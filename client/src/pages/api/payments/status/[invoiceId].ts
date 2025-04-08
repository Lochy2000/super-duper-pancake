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

// Helper to transform Supabase payment data to client-expected format
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
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get invoice ID from URL
    const invoiceId = req.query.invoiceId as string;
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

    // First check if the invoice exists and belongs to this user
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, user_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') { // Record not found
        return res.status(404).json({ error: 'Invoice not found' });
      }
      console.error('Error fetching invoice:', invoiceError);
      return res.status(500).json({ error: 'Failed to fetch invoice' });
    }

    // Verify the invoice belongs to the authenticated user
    if (invoice.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this invoice' });
    }

    // Get the latest payment for this invoice
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentError) {
      // If no payment found, return empty or default status
      if (paymentError.code === 'PGRST116') { // Record not found
        return res.status(200).json({
          invoiceId,
          status: 'pending',
          message: 'No payment found for this invoice'
        });
      }
      
      console.error('Error fetching payment:', paymentError);
      return res.status(500).json({ error: 'Failed to fetch payment status' });
    }

    // Transform and return the payment data
    const transformedPayment = transformPaymentData(payment);
    return res.status(200).json(transformedPayment);

  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 