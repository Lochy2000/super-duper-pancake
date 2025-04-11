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

// Helper to transform Supabase invoice data to the client-expected format
const transformInvoiceData = (invoice: any) => {
  return {
    _id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    clientId: invoice.client_id,
    clientName: invoice.clients?.name || '',
    clientEmail: invoice.clients?.email || '',
    items: invoice.items || [],
    subtotal: parseFloat(invoice.amount || 0) / (1 + (invoice.tax_rate || 0) / 100),
    tax: parseFloat(invoice.amount || 0) - (parseFloat(invoice.amount || 0) / (1 + (invoice.tax_rate || 0) / 100)),
    total: parseFloat(invoice.amount || 0),
    status: invoice.status || 'unpaid',
    dueDate: invoice.due_date,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoiceNumber, accessToken } = req.query;

    if (!invoiceNumber || !accessToken) {
      return res.status(400).json({ error: 'Invoice number and access token are required' });
    }

    // Get invoice with client information
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('invoice_number', invoiceNumber)
      .eq('access_token', accessToken)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return res.status(404).json({ error: 'Invoice not found or access denied' });
    }

    // Check if access token has expired
    const tokenExpiresAt = new Date(invoice.token_expires_at);
    const now = new Date();
    if (tokenExpiresAt < now) {
      return res.status(401).json({ error: 'Access token has expired' });
    }

    // Transform and return the invoice data
    const transformedData = transformInvoiceData(invoice);
    return res.status(200).json(transformedData);

  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 