import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'react-toastify';
import Layout from '../../../../components/layout/Layout';
import InvoiceForm from '../../../../components/invoices/InvoiceForm';
import { useAuth } from '../../../../hooks/useAuth';
import { useInvoices } from '../../../../hooks/useInvoices';
import { getInvoiceById } from '../../../../services/invoiceService';
import { Invoice } from '../../../../services/invoiceService';

const EditInvoice: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { updateInvoice } = useInvoices();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { id } = router.query;
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin/login');
    }
  }, [user, authLoading, router]);
  
  // Fetch invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await getInvoiceById(id as string);
        setInvoice(response.data);
      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast.error('Failed to load invoice data');
        router.push('/admin/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchInvoice();
    }
  }, [id, user, router]);
  
  const handleSubmit = async (data: any) => {
    if (!id) return;
    
    try {
      setIsSubmitting(true);
      await updateInvoice(id as string, data);
      toast.success('Invoice updated successfully');
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading || loading) {
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
  
  if (!invoice) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="card max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="mb-6">Invoice not found or unable to load invoice data.</p>
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className="btn-primary"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Head>
        <title>Edit Invoice | Invoice System</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Edit Invoice #{invoice.invoiceNumber}</h1>
        </div>
        
        <div className="card">
          <InvoiceForm
            initialData={invoice}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </Layout>
  );
};

export default EditInvoice;
