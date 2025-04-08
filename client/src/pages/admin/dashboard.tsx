import React, { useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { useInvoices } from '../../hooks/useInvoices';
import type { Invoice } from '../../services/invoiceService';

const AdminDashboard: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { invoices: apiInvoices, loading: invoicesLoading, error: apiError, deleteInvoice } = useInvoices();
  const router = useRouter();
  
  // Ensure invoices is always an array
  const invoicesArray: Invoice[] = Array.isArray(apiInvoices) ? apiInvoices : [];
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/admin/login');
    }
  }, [user, authLoading, router]);

  // Show loading state
  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  // If not authenticated, don't render anything while redirecting
  if (!user) {
    return null;
  }
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await deleteInvoice(id);
        toast.success('Invoice deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete invoice');
      }
    }
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Layout>
      <Head>
        <title>Admin Dashboard - Invoice System</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Invoice Dashboard</h1>
          <Link
            href="/admin/invoices/create"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Create New Invoice
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Total Invoices</h3>
            <p className="text-2xl font-bold">{invoicesArray.length}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Paid</h3>
            <p className="text-2xl font-bold text-green-600">
              {invoicesArray.filter(inv => inv.status === 'paid').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Unpaid</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {invoicesArray.filter(inv => inv.status === 'unpaid').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Overdue</h3>
            <p className="text-2xl font-bold text-red-600">
              {invoicesArray.filter(inv => inv.status === 'overdue').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded shadow overflow-x-auto">
          <h2 className="text-xl font-semibold p-4 border-b">Recent Invoices</h2>
          {invoicesLoading ? (
            <div className="p-4 text-center">Loading invoices...</div>
          ) : invoicesArray.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No invoices found. Create your first invoice.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Invoice #</th>
                  <th className="px-4 py-2 text-left">Client</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Due Date</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoicesArray.map((invoice) => (
                  <tr key={invoice._id} className="border-t">
                    <td className="px-4 py-2">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-2">{invoice.clientName}</td>
                    <td className="px-4 py-2">${invoice.total.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-sm ${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        <Link
                          href={`/admin/invoices/edit/${invoice._id}`}
                          className="text-blue-500 hover:text-blue-600"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(invoice._id!)}
                          className="text-red-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                        <Link
                          href={`/invoices/${invoice.invoiceNumber}`}
                          target="_blank"
                          className="text-green-500 hover:text-green-600"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
