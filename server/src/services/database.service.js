const supabase = require('../config/supabase');

class DatabaseService {
  // User Profile Methods
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateUserProfile(userId, profileData) {
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Client Methods
  async getClients(userId) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    return data;
  }

  async getClient(userId, clientId) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .eq('id', clientId)
      .single();

    if (error) throw error;
    return data;
  }

  async createClient(userId, clientData) {
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...clientData, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateClient(userId, clientId, clientData) {
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('user_id', userId)
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteClient(userId, clientId) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('user_id', userId)
      .eq('id', clientId);

    if (error) throw error;
    return true;
  }

  // Invoice Methods
  async getInvoices(userId, filters = {}) {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        clients (
          name,
          email
        )
      `)
      .eq('user_id', userId);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus);
    }
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getInvoice(userId, invoiceId) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          name,
          email,
          phone,
          address
        )
      `)
      .eq('user_id', userId)
      .eq('id', invoiceId)
      .single();

    if (error) throw error;
    return data;
  }

  async createInvoice(userId, invoiceData) {
    const { data, error } = await supabase
      .from('invoices')
      .insert({ ...invoiceData, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateInvoice(userId, invoiceId, invoiceData) {
    const { data, error } = await supabase
      .from('invoices')
      .update(invoiceData)
      .eq('user_id', userId)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteInvoice(userId, invoiceId) {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('user_id', userId)
      .eq('id', invoiceId);

    if (error) throw error;
    return true;
  }

  // Payment Methods
  async getPayments(invoiceId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createPayment(paymentData) {
    const { data, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Helper Methods
  async getNextInvoiceNumber(userId) {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return 'INV-0001';
    }

    const lastNumber = parseInt(data[0].invoice_number.split('-')[1]);
    return `INV-${String(lastNumber + 1).padStart(4, '0')}`;
  }
}

module.exports = new DatabaseService();
