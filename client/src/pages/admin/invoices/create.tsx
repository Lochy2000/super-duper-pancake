import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'react-toastify';
import Layout from '../../../components/layout/Layout';
import InvoiceForm from '../../../components/invoices/InvoiceForm';
import { useAuth } from '../../../hooks/useAuth';
import { useInvoices } from '../../../hooks/useInvoices';

const CreateInvoice: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { createInvoice } = useInvoices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin/login');
    }
  }, [user, authLoading, router]);
  
  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      await createInvoice(data);
      toast.success('Invoice created successfully');
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading) {
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
        <title>Create Invoice | Invoice System</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
        </div>
        
        <div className="card">
          <InvoiceForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </Layout>
  );
};

export default CreateInvoice;
