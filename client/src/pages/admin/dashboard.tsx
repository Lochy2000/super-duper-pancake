import React, { useEffect, useState } from 'react';
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
  const [error, setError] = useState<string | null>(apiError);
  const router = useRouter();
  
  // Ensure invoices is always an array
  const invoicesArray: Invoice[] = Array.isArray(apiInvoices) ? apiInvoices : [];
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin/login');
    }
  }, [user, authLoading, router]);
  
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await deleteInvoice(id);
      } catch (error) {
        console.error('Delete error:', error);
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
  
  if (authLoading || invoicesLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </Layout>
    );
  }
  
  if (!user) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <Layout>
      <Head>
        <title>Admin Dashboard | Invoice System</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Invoice Dashboard</h1>
          
          <Link href="/admin/invoices/create" className="btn-primary">
            Create New Invoice
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {/* Invoice Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card bg-blue-50 border border-blue-100">
            <h3 className="text-lg font-medium text-blue-700 mb-2">Total Invoices</h3>
            <p className="text-3xl font-bold">{invoicesArray.length}</p>
          </div>
          
          <div className="card bg-green-50 border border-green-100">
            <h3 className="text-lg font-medium text-green-700 mb-2">Paid</h3>
            <p className="text-3xl font-bold">
              {invoicesArray.filter(inv => inv.status === 'paid').length}
            </p>
          </div>
          
          <div className="card bg-yellow-50 border border-yellow-100">
            <h3 className="text-lg font-medium text-yellow-700 mb-2">Unpaid</h3>
            <p className="text-3xl font-bold">
              {invoicesArray.filter(inv => inv.status === 'unpaid').length}
            </p>
          </div>
          
          <div className="card bg-red-50 border border-red-100">
            <h3 className="text-lg font-medium text-red-700 mb-2">Overdue</h3>
            <p className="text-3xl font-bold">
              {invoicesArray.filter(inv => inv.status === 'overdue').length}
            </p>
          </div>
        </div>
        
        {/* Invoices Table */}
        <div className="card overflow-hidden">
          <h2 className="text-xl font-bold mb-4">Recent Invoices</h2>
          
          {invoicesArray.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No invoices found. Create your first invoice!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Invoice #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Due Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesArray.map((invoice) => (
                    <tr key={invoice._id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link 
                          href={`/invoices/${invoice.invoiceNumber}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{invoice.clientName}</td>
                      <td className="px-4 py-3">
                        {invoice.createdAt ? format(new Date(invoice.createdAt), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3">${invoice.total.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/invoices/edit/${invoice._id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(invoice._id!)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                          <Link
                            href={`/invoices/${invoice.invoiceNumber}`}
                            target="_blank"
                            className="text-green-600 hover:text-green-800"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
