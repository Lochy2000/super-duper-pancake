const supabase = require('../config/db');

class Invoice {
  static async create(invoiceData) {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        ...invoiceData,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
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

  static async findByNumber(invoiceNumber) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        items:invoice_items(*)
      `)
      .eq('invoice_number', invoiceNumber)
      .single();

    if (error) throw error;
    return data;
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
