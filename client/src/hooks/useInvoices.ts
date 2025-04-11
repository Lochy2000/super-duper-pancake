import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'unpaid' | 'overdue';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to ensure invoice dates are valid
  const validateInvoiceDates = (invoice: Invoice): Invoice => {
    // Make a copy of the invoice to avoid mutation
    const validatedInvoice = { ...invoice };
    
    // Validate created date
    if (invoice.createdAt) {
      try {
        const date = new Date(invoice.createdAt);
        if (isNaN(date.getTime())) {
          validatedInvoice.createdAt = new Date().toISOString();
        }
      } catch {
        validatedInvoice.createdAt = new Date().toISOString();
      }
    }
    
    // Validate due date
    if (invoice.dueDate) {
      try {
        const date = new Date(invoice.dueDate);
        if (isNaN(date.getTime())) {
          // Set a default due date 30 days from now
          const defaultDate = new Date();
          defaultDate.setDate(defaultDate.getDate() + 30);
          validatedInvoice.dueDate = defaultDate.toISOString();
        }
      } catch {
        // Set a default due date 30 days from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        validatedInvoice.dueDate = defaultDate.toISOString();
      }
    } else {
      // If due date is missing, set a default
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      validatedInvoice.dueDate = defaultDate.toISOString();
    }
    
    // Ensure status is valid
    if (!validatedInvoice.status || !['paid', 'unpaid', 'overdue'].includes(validatedInvoice.status)) {
      validatedInvoice.status = 'unpaid';
    }
    
    return validatedInvoice;
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/invoices');
      
      // Log the response to debug
      console.log('API response:', data);
      
      // Ensure we have an array of invoices
      if (Array.isArray(data)) {
        // Validate each invoice's dates
        const validatedInvoices = data.map(validateInvoiceDates);
        setInvoices(validatedInvoices);
        setError(null);
      } else if (data && data.success && Array.isArray(data.data)) {
        // Handle case where API returns { success: true, data: [...] }
        // Validate each invoice's dates
        const validatedInvoices = data.data.map(validateInvoiceDates);
        setInvoices(validatedInvoices);
        setError(null);
      } else {
        console.error('Unexpected API response format:', data);
        setInvoices([]);
        setError('Received unexpected data format from server');
      }
      
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError(err.message || 'Failed to load invoices. Please try again.');
      setInvoices([]);
      toast.error(err.message || 'Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const createInvoice = async (invoiceData: Omit<Invoice, '_id'>) => {
    try {
      const { data } = await api.post('/api/invoices', invoiceData);
      setInvoices(prev => [...prev, data]);
      toast.success('Invoice created successfully');
      return data;
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      toast.error(err.message || 'Failed to create invoice');
      throw err;
    }
  };

  const updateInvoice = async (id: string, invoiceData: Partial<Invoice>) => {
    try {
      const { data } = await api.put(`/api/invoices/${id}`, invoiceData);
      setInvoices(prev => prev.map(inv => inv._id === id ? data : inv));
      toast.success('Invoice updated successfully');
      return data;
    } catch (err: any) {
      console.error('Error updating invoice:', err);
      toast.error(err.message || 'Failed to update invoice');
      throw err;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await api.delete(`/api/invoices/${id}`);
      setInvoices(prev => prev.filter(inv => inv._id !== id));
      toast.success('Invoice deleted successfully');
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      toast.error(err.message || 'Failed to delete invoice');
      throw err;
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const response = await api.put(`/api/invoices/${id}`, { status: 'paid' });
      setInvoices(prev => prev.map(inv => inv._id === id ? response.data : inv));
      toast.success('Invoice marked as paid');
      return response.data;
    } catch (err: any) {
      console.error('Error marking invoice as paid:', err);
      toast.error(err.message || 'Failed to update invoice status');
      throw err;
    }
  };

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markAsPaid
  };
}
