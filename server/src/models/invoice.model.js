const supabase = require('../config/db');

class Invoice {
  static async create(invoiceData) {
    // --- BEGIN DEBUG LOGGING ---
    console.log('>>> [Invoice.create] Received invoiceData:', JSON.stringify(invoiceData, null, 2));
    if (invoiceData.access_token) {
      console.log('>>> [Invoice.create] access_token is PRESENT before insert.');
    } else {
      console.log('>>> [Invoice.create] WARNING: access_token is MISSING before insert.');
    }
    if (invoiceData.token_expires_at) {
      console.log('>>> [Invoice.create] token_expires_at is PRESENT before insert.');
    } else {
      console.log('>>> [Invoice.create] WARNING: token_expires_at is MISSING before insert.');
    }
    // --- END DEBUG LOGGING ---
    
    const insertObject = {
        ...invoiceData,
        status: 'pending',
        created_at: new Date().toISOString()
    };
    
    console.log('>>> [Invoice.create] Object being inserted:', JSON.stringify(insertObject, null, 2));

    const { data, error } = await supabase
      .from('invoices')
      .insert(insertObject) // Use the prepared object
      .select()
      .single();

    if (error) {
       console.error('>>> [Invoice.create] Supabase Insert Error:', error);
       throw error;
    }
    console.log('>>> [Invoice.create] Insert successful, returned data:', data);
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        items:invoice_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async findByNumber(invoiceNumber, accessToken) {
    // First, get the invoice without access token check
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        items:invoice_items(*)
      `)
      .eq('invoice_number', invoiceNumber)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') { // No rows found
        throw new Error('Invoice not found.');
      }
      throw invoiceError;
    }

    // Now validate the access token if provided
    if (!accessToken) {
      throw new Error('Access token is required to view this invoice.');
    }

    // Check if access token matches and hasn't expired
    if (invoice.access_token !== accessToken) {
      throw new Error('Invalid access token.');
    }

    const now = new Date();
    const tokenExpiry = new Date(invoice.token_expires_at);
    if (tokenExpiry < now) {
      throw new Error('Access token has expired.');
    }

    return invoice;
  }

  static async findByUser(userId, query = {}) {
    let queryBuilder = supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        items:invoice_items(*)
      `)
      .eq('user_id', userId);

    // Add filters
    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }
    if (query.clientId) {
      queryBuilder = queryBuilder.eq('client_id', query.clientId);
    }
    if (query.startDate) {
      queryBuilder = queryBuilder.gte('created_at', query.startDate);
    }
    if (query.endDate) {
      queryBuilder = queryBuilder.lte('created_at', query.endDate);
    }

    // Add sorting
    if (query.sortBy) {
      queryBuilder = queryBuilder.order(query.sortBy, { ascending: query.sortOrder !== 'desc' });
    } else {
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;
    return data;
  }

  static async findByClientAuthId(clientAuthId, query = {}) {
    let queryBuilder = supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
        // Note: We might not need client:clients(*) here if the client is fetching their own
      `)
      .eq('client_auth_id', clientAuthId);

    // Add optional filters (e.g., status)
    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }

    // Add sorting (e.g., newest first)
    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    const { data, error } = await queryBuilder;

    if (error) throw error;
    return data;
  }

  static async update(id, updateData) {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async addItems(invoiceId, items) {
    const { data, error } = await supabase
      .from('invoice_items')
      .insert(
        items.map(item => ({
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          created_at: new Date().toISOString()
        }))
      )
      .select();

    if (error) throw error;
    return data;
  }

  static async updateItems(invoiceId, items) {
    // First delete existing items
    await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoiceId);

    // Then add new items
    return this.addItems(invoiceId, items);
  }

  static async calculateTotals(items) {
    const subtotal = items.reduce((acc, item) => {
      return acc + (item.quantity * item.price);
    }, 0);

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  }
}

module.exports = Invoice;
