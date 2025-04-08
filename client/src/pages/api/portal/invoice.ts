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
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get invoice number from query parameters
    const invoiceNumber = req.query.number as string;
    if (!invoiceNumber) {
      return res.status(400).json({ error: 'Invoice number is required' });
    }

    // Find the invoice by invoice number
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('invoice_number', invoiceNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Record not found
        return res.status(404).json({ error: 'Invoice not found' });
      }
      console.error('Error fetching invoice:', error);
      return res.status(500).json({ error: 'Failed to fetch invoice' });
    }

    // Transform and return the invoice data
    const transformedData = transformInvoiceData(invoice);
    
    // Include payment status if needed
    return res.status(200).json(transformedData);
  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 