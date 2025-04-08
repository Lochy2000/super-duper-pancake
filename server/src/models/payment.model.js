const supabase = require('../config/db');

class Payment {
  static async create(paymentData) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        ...paymentData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async findByInvoiceId(invoiceId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async findByUser(userId, query = {}) {
    let queryBuilder = supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(*)
      `)
      .eq('user_id', userId);

    // Add filters
    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }
    if (query.paymentMethod) {
      queryBuilder = queryBuilder.eq('payment_method', query.paymentMethod);
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
      .from('payments')
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
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async getStats(userId) {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return {
      totalPayments: payments.length,
      totalAmount: payments.reduce((acc, payment) => acc + payment.amount, 0),
      byMethod: payments.reduce((acc, payment) => {
        if (!acc[payment.payment_method]) {
          acc[payment.payment_method] = {
            count: 0,
            amount: 0
          };
        }
        acc[payment.payment_method].count++;
        acc[payment.payment_method].amount += payment.amount;
        return acc;
      }, {})
    };
  }
}

module.exports = Payment;
