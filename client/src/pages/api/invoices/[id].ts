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
    clientName: invoice.client_name || '',
    clientEmail: invoice.client_email || '',
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

// Helper to transform client invoice data to Supabase format
const transformForSupabase = (invoiceData: any) => {
  const result: any = {};
  
  // Only include properties that are provided (for partial updates)
  if (invoiceData.clientId !== undefined) result.client_id = invoiceData.clientId;
  if (invoiceData.invoiceNumber !== undefined) result.invoice_number = invoiceData.invoiceNumber;
  if (invoiceData.status !== undefined) {
    result.status = invoiceData.status;
    result.payment_status = invoiceData.status === 'paid' ? 'paid' : 'unpaid';
    // If marking as paid, set the paid date
    if (invoiceData.status === 'paid') {
      result.paid_date = new Date().toISOString();
    }
  }
  if (invoiceData.total !== undefined) result.amount = invoiceData.total;
  if (invoiceData.dueDate !== undefined) result.due_date = invoiceData.dueDate;
  if (invoiceData.items !== undefined) result.items = invoiceData.items;
  if (invoiceData.notes !== undefined) result.notes = invoiceData.notes;
  // clientName and clientEmail are now handled via the clients table, not directly in invoices
  
  // Calculate tax rate if both subtotal and tax are provided
  if (invoiceData.tax !== undefined && invoiceData.subtotal !== undefined) {
    result.tax_rate = (invoiceData.tax / invoiceData.subtotal) * 100;
  }
  
  // Always update the updated_at timestamp
  result.updated_at = new Date().toISOString();
  
  return result;
};

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
  try {
    // Check if request method is allowed
    if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get invoice ID from URL
    const invoiceId = req.query.id as string;
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

    // Handle GET request (get single invoice)
    if (req.method === 'GET') {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*, clients(*)')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Record not found
          return res.status(404).json({ error: 'Invoice not found' });
        }
        console.error('Error fetching invoice:', error);
        return res.status(500).json({ error: 'Failed to fetch invoice' });
      }

      // Transform data to client format, including client data
      let clientName = invoice.client_name;
      let clientEmail = invoice.client_email;
      
      // If we have client data from the join, prefer that
      if (invoice.clients) {
        clientName = invoice.clients.name || clientName;
        clientEmail = invoice.clients.email || clientEmail;
      }
      
      const transformedData = {
        _id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientId: invoice.client_id,
        clientName: clientName || '',
        clientEmail: clientEmail || '',
        items: invoice.items || [],
        subtotal: parseFloat(invoice.amount || 0) / (1 + (invoice.tax_rate || 0) / 100),
        tax: parseFloat(invoice.amount || 0) - (parseFloat(invoice.amount || 0) / (1 + (invoice.tax_rate || 0) / 100)),
        total: parseFloat(invoice.amount || 0),
        status: invoice.status || 'unpaid',
        dueDate: invoice.due_date,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at
      };
      
      return res.status(200).json(transformedData);
    }

    // Handle PUT request (update invoice)
    if (req.method === 'PUT') {
      const invoiceData = req.body;
      
      // First, check if the invoice exists and belongs to this user
      const { data: existingInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();
        
      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // Record not found
          return res.status(404).json({ error: 'Invoice not found' });
        }
        console.error('Error fetching invoice for update:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch invoice for update' });
      }
      
      // If client information is being updated, we need to update the client record or create a new one
      if (invoiceData.clientName !== undefined || invoiceData.clientEmail !== undefined) {
        // Get existing client email from the current invoice
        const existingClientId = existingInvoice.client_id;
        
        // If we have both new name and email
        if (invoiceData.clientName !== undefined && invoiceData.clientEmail !== undefined) {
          // First check if there's an existing client with the new email
          const { data: existingClientWithEmail, error: clientLookupError } = await supabase
            .from('clients')
            .select('id')
            .eq('email', invoiceData.clientEmail)
            .eq('user_id', userId)
            .maybeSingle();
            
          if (clientLookupError) {
            console.error('Error looking up client by email:', clientLookupError);
            return res.status(500).json({ error: 'Failed to check for existing client' });
          }
          
          if (existingClientWithEmail) {
            // Use the existing client with this email
            invoiceData.clientId = existingClientWithEmail.id;
          } else if (existingClientId) {
            // Update the existing client record
            const { error: clientUpdateError } = await supabase
              .from('clients')
              .update({
                name: invoiceData.clientName,
                email: invoiceData.clientEmail,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingClientId)
              .eq('user_id', userId);
              
            if (clientUpdateError) {
              console.error('Error updating client:', clientUpdateError);
              return res.status(500).json({ error: 'Failed to update client record' });
            }
            
            // Keep the same client ID
            invoiceData.clientId = existingClientId;
          } else {
            // Create a new client
            const { data: newClient, error: clientCreateError } = await supabase
              .from('clients')
              .insert([{
                user_id: userId,
                name: invoiceData.clientName,
                email: invoiceData.clientEmail,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }])
              .select()
              .single();
              
            if (clientCreateError) {
              console.error('Error creating client:', clientCreateError);
              return res.status(500).json({ error: 'Failed to create client record' });
            }
            
            invoiceData.clientId = newClient.id;
          }
        }
      }
      
      // Prepare the data for update
      const supabaseData = transformForSupabase(invoiceData);

      // Update in Supabase
      const { data, error } = await supabase
        .from('invoices')
        .update(supabaseData)
        .eq('id', invoiceId)
        .eq('user_id', userId) // Extra security, though RLS should handle this
        .select()
        .single();

      if (error) {
        console.error('Error updating invoice:', error);
        return res.status(500).json({ error: 'Failed to update invoice' });
      }

      // Get client data to include in response
      let clientData = null;
      if (data.client_id) {
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', data.client_id)
          .maybeSingle();
          
        if (!clientError && client) {
          clientData = client;
        }
      }
      
      // Transform the returned data to client format
      const transformedData = {
        _id: data.id,
        invoiceNumber: data.invoice_number,
        clientId: data.client_id,
        clientName: clientData ? clientData.name : data.client_name || '',
        clientEmail: clientData ? clientData.email : data.client_email || '',
        items: data.items || [],
        subtotal: parseFloat(data.amount || 0) / (1 + (data.tax_rate || 0) / 100),
        tax: parseFloat(data.amount || 0) - (parseFloat(data.amount || 0) / (1 + (data.tax_rate || 0) / 100)),
        total: parseFloat(data.amount || 0),
        status: data.status || 'unpaid',
        dueDate: data.due_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      return res.status(200).json(transformedData);
    }

    // Handle DELETE request (delete invoice)
    if (req.method === 'DELETE') {
      // First, check if the invoice exists and belongs to this user
      const { data: existingInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select('id') // We only need the ID to confirm existence
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();
        
      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // Record not found
          return res.status(404).json({ error: 'Invoice not found' });
        }
        console.error('Error fetching invoice for deletion:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch invoice for deletion' });
      }
      
      // Delete from Supabase
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', userId); // Extra security, though RLS should handle this

      if (error) {
        console.error('Error deleting invoice:', error);
        return res.status(500).json({ error: 'Failed to delete invoice' });
      }

      // Return success response
      return res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
    }
  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 