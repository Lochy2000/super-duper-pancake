import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as invoiceService from '../services/invoiceService';

export function useInvoices() {
  const [invoices, setInvoices] = useState<invoiceService.Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to ensure invoice dates are valid
const validateInvoiceDates = (invoice: invoiceService.Invoice): invoiceService.Invoice => {
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
      const response = await invoiceService.getInvoices();
      
      // Log the response to debug
      console.log('API response:', response);
      
      // Ensure we have an array of invoices
      if (Array.isArray(response.data)) {
        // Validate each invoice's dates
        const validatedInvoices = response.data.map(validateInvoiceDates);
        setInvoices(validatedInvoices);
        setError(null);
      } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
        // Handle case where API returns { success: true, data: [...] }
        // Validate each invoice's dates
        const validatedInvoices = response.data.data.map(validateInvoiceDates);
        setInvoices(validatedInvoices);
        setError(null);
      } else {
        console.error('Unexpected API response format:', response.data);
        setInvoices([]);
        setError('Received unexpected data format from server');
      }
      
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setInvoices([]);
      const errorMessage = err.response?.data?.error?.message || 'Failed to load invoices. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const createInvoice = async (invoice: Omit<invoiceService.Invoice, '_id'>) => {
    try {
      const response = await invoiceService.createInvoice(invoice);
      setInvoices(prev => [...prev, response.data]);
      toast.success('Invoice created successfully');
      return response.data;
    } catch (err) {
      console.error('Error creating invoice:', err);
      toast.error('Failed to create invoice');
      throw err;
    }
  };

  const updateInvoice = async (id: string, data: Partial<invoiceService.Invoice>) => {
    try {
      const response = await invoiceService.updateInvoice(id, data);
      setInvoices(prev => prev.map(inv => inv._id === id ? response.data : inv));
      toast.success('Invoice updated successfully');
      return response.data;
    } catch (err) {
      console.error('Error updating invoice:', err);
      toast.error('Failed to update invoice');
      throw err;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await invoiceService.deleteInvoice(id);
      setInvoices(prev => prev.filter(inv => inv._id !== id));
      toast.success('Invoice deleted successfully');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toast.error('Failed to delete invoice');
      throw err;
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const response = await invoiceService.markInvoiceAsPaid(id);
      setInvoices(prev => prev.map(inv => inv._id === id ? response.data : inv));
      toast.success('Invoice marked as paid');
      return response.data;
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      toast.error('Failed to update invoice status');
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
