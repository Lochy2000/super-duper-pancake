import api from './api';

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  _id?: string;
  invoiceNumber: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'unpaid' | 'paid' | 'overdue';
  dueDate: string;
  createdAt?: string;
  updatedAt?: string;
}

// Get all invoices
export const getInvoices = () => {
  return api.get<Invoice[]>('/api/invoices');
};

// Get single invoice by ID
export const getInvoiceById = (id: string) => {
  return api.get<Invoice>(`/api/invoices/${id}`);
};

// Get invoice by invoice number (for public/client access)
export const getInvoiceByNumber = (invoiceNumber: string) => {
  return api.get<Invoice>(`/api/portal/invoice`, {
    params: { number: invoiceNumber }
  });
};

// Create new invoice
export const createInvoice = (invoiceData: Omit<Invoice, '_id'>) => {
  return api.post<Invoice>('/api/invoices', invoiceData);
};

// Update invoice
export const updateInvoice = (id: string, invoiceData: Partial<Invoice>) => {
  return api.put<Invoice>(`/api/invoices/${id}`, invoiceData);
};

// Delete invoice
export const deleteInvoice = (id: string) => {
  return api.delete(`/api/invoices/${id}`);
};

// Mark invoice as paid
export const markInvoiceAsPaid = (id: string) => {
  return api.put<Invoice>(`/api/invoices/${id}/pay`, {});
};

// Send invoice email
export const sendInvoiceEmail = (id: string, email: string) => {
  return api.post(`/api/invoices/${id}/send`, { email });
};
