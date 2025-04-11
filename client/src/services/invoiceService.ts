import api from './api';

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
  status: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

// Get all invoices (admin only)
export const getInvoices = () => {
  return api.get<Invoice[]>('/api/invoices');
};

// Get single invoice by ID (admin only)
export const getInvoice = (id: string) => {
  return api.get<Invoice>(`/api/invoices/${id}`);
};

// Get invoice by invoice number and access token (secure public access)
export const getInvoiceForPayment = (invoiceNumber: string, accessToken: string) => {
  return api.get<Invoice>(`/api/invoices/public/${invoiceNumber}/${accessToken}`);
};

// Get invoices for the logged-in client (Client Portal)
export const getClientPortalInvoices = (status?: string) => {
  const params = status ? { status } : {};
  return api.get<Invoice[]>('/api/client/invoices', { params });
};

// Create new invoice (admin only)
export const createInvoice = (data: Partial<Invoice>) => {
  return api.post<Invoice>('/api/invoices', data);
};

// Update invoice (admin only)
export const updateInvoice = (id: string, data: Partial<Invoice>) => {
  return api.put<Invoice>(`/api/invoices/${id}`, data);
};

// Delete invoice (admin only)
export const deleteInvoice = (id: string) => {
  return api.delete(`/api/invoices/${id}`);
};

// Mark invoice as paid (admin only)
export const markInvoiceAsPaid = (id: string) => {
  return api.put<Invoice>(`/api/invoices/${id}/pay`, {});
};

// Send invoice email (admin only)
export const sendInvoiceEmail = (id: string, email: string) => {
  return api.post(`/api/invoices/${id}/send`, { email });
};
