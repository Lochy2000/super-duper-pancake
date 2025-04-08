const supabase = require('../config/db');

class Client {
  static async create(clientData) {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...clientData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async findByUser(userId, query = {}) {
    let queryBuilder = supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId);

    // Add filters
    if (query.name) {
      queryBuilder = queryBuilder.ilike('name', `%${query.name}%`);
    }
    if (query.email) {
      queryBuilder = queryBuilder.ilike('email', `%${query.email}%`);
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
      .from('clients')
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
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async getInvoices(id) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getStats(id) {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', id);

    if (error) throw error;

    return {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((acc, inv) => acc + inv.total, 0),
      paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
      pendingInvoices: invoices.filter(inv => inv.status === 'pending').length
    };
  }
}

module.exports = Client;
