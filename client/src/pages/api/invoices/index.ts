import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error('CRITICAL: Missing RESEND_API_KEY environment variable.');
  // Decide if you want to throw an error or log and continue without email sending
}
const resend = new Resend(resendApiKey);

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
  return {
    client_id: invoiceData.clientId,
    invoice_number: invoiceData.invoiceNumber,
    status: invoiceData.status,
    amount: invoiceData.total,
    currency: 'USD', // Default or from invoiceData if present
    due_date: invoiceData.dueDate,
    items: invoiceData.items,
    // Optional fields
    payment_status: invoiceData.status === 'paid' ? 'paid' : 'unpaid',
    notes: invoiceData.notes,
    // Tax info
    tax_rate: (invoiceData.tax && invoiceData.subtotal) ? 
      (invoiceData.tax / invoiceData.subtotal) * 100 : 0
    // client_name and client_email are now stored in the clients table, not in invoices
  };
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
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get authenticated user ID
    let userId;
    try {
      userId = await getUserId(req);
    } catch (error: any) {
      return res.status(401).json({ error: error.message || 'Authentication failed' });
    }

    // Handle GET request (list invoices)
    if (req.method === 'GET') {
      // Get base invoice data
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*, clients(*)')
        .eq('user_id', userId);

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
        return res.status(500).json({ error: 'Failed to fetch invoices' });
      }

      // Transform data to client format, including client data from the join
      const transformedData = invoices.map(invoice => {
        // Use client data from the join if available
        let clientName = invoice.client_name;
        let clientEmail = invoice.client_email;
        
        // If we have client data from the join, prefer that
        if (invoice.clients) {
          clientName = invoice.clients.name || clientName;
          clientEmail = invoice.clients.email || clientEmail;
        }
        
        return {
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
      });
      
      return res.status(200).json(transformedData);
    }

    // Handle POST request (create invoice)
    if (req.method === 'POST') {
      const invoiceData = req.body;
      
      // Check if we have client data
      if (!invoiceData.clientName || !invoiceData.clientEmail) {
        return res.status(400).json({ error: 'Client name and email are required' });
      }
      
      // Step 1: Look for an existing client with this email for this user
      const { data: existingClient, error: clientLookupError } = await supabase
        .from('clients')
        .select('id')
        .eq('email', invoiceData.clientEmail)
        .eq('user_id', userId)
        .maybeSingle(); // Returns null if no match, instead of error
        
      if (clientLookupError) {
        console.error('Error looking up client:', clientLookupError);
        return res.status(500).json({ error: 'Failed to check for existing client' });
      }
      
      let clientId;
      
      // If client exists, use its ID
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // If client doesn't exist, create a new one
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
        
        clientId = newClient.id;
      }
      
      // Now prepare the invoice data with the client ID
      const supabaseData = {
        ...transformForSupabase(invoiceData),
        client_id: clientId, // Use the client ID we looked up or created
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('invoices')
        .insert([supabaseData])
        .select()
        .single();

      if (error) {
        console.error('Error creating invoice:', error);
        return res.status(500).json({ error: 'Failed to create invoice' });
      }

      // Transform the returned data to client format
      const transformedData = transformInvoiceData(data);

      // ---- START: Send Invoice Creation Email ----
      if (resendApiKey) {
        // Use the client email and name directly from the input data
        const clientEmailToSend = invoiceData.clientEmail;
        const clientNameToSend = invoiceData.clientName;
        const invoiceNumberToSend = data.invoice_number; // Get invoice number from DB result
        const totalToSend = data.amount; // Get total from DB result
        const dueDateToSend = data.due_date; // Get due date from DB result
        
        if (clientEmailToSend) { // Ensure we have an email to send to
          try {
            const viewInvoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoices/${invoiceNumberToSend}`;
            await resend.emails.send({
              from: 'Invoice System <noreply@easywebs.uk>', 
              to: [clientEmailToSend],
              subject: `New Invoice Created: ${invoiceNumberToSend}`,
              html: `
                <h1>New Invoice #${invoiceNumberToSend}</h1>
                <p>Hello ${clientNameToSend || 'Client'},</p> 
                <p>A new invoice for $${totalToSend.toFixed(2)} has been created for you.</p>
                <p>Due Date: ${new Date(dueDateToSend).toLocaleDateString()}</p>
                <p>You can view and pay the invoice here: <a href="${viewInvoiceUrl}">View Invoice</a></p>
                <p>Thank you!</p>
              `,
              // Add plain text version for deliverability
              text: 
`New Invoice #${invoiceNumberToSend}

Hello ${clientNameToSend || 'Client'},

A new invoice for $${totalToSend.toFixed(2)} has been created for you.

Due Date: ${new Date(dueDateToSend).toLocaleDateString()}

View and pay the invoice here: ${viewInvoiceUrl}

Thank you!`
            });
            console.log(`✉️ Invoice creation email sent successfully to ${clientEmailToSend}`);
          } catch (emailError) {
            console.error('❌ Error sending invoice creation email via Resend:', emailError);
            // Decide how to handle email errors - log, return specific error, etc.
            // Don't fail the API request just because the email failed.
          }
        } else {
          console.warn('⚠️ Client email was missing in the request data. Skipping invoice creation email.');
        }
      } else {
         console.warn('⚠️ Resend API key not configured. Skipping invoice creation email.');
      }
      // ---- END: Send Invoice Creation Email ----

      return res.status(201).json(transformedData);
    }
  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 