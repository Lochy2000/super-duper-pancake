import React, { useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../../hooks/useAuth';
import Layout from '../../../components/layout/Layout';
import { getInvoiceById } from '../../../services/invoiceService';

// This is a redirect page to handle the case when admin clicks on an invoice in the dashboard
const AdminInvoiceDetail: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  
  useEffect(() => {
    // Check if user is authenticated
    if (!authLoading && !user) {
      router.push('/admin/login');
      return;
    }
    
    // Fetch the invoice by ID and redirect to the public invoice page
    const fetchInvoiceAndRedirect = async () => {
      if (!id) return;
      
      try {
        const response = await getInvoiceById(id as string);
        const invoice = response.data;
        
        // Redirect to the public invoice page using the invoice number
        router.push(`/invoices/${invoice.invoiceNumber}`);
      } catch (error) {
        console.error('Error fetching invoice:', error);
        // If there's an error, redirect to the dashboard
        router.push('/admin/dashboard');
      }
    };
    
    fetchInvoiceAndRedirect();
  }, [id, user, authLoading, router]);
  
  return (
    <Layout>
      <Head>
        <title>Redirecting... | Invoice System</title>
      </Head>
      
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to invoice...</p>
      </div>
    </Layout>
  );
};

export default AdminInvoiceDetail;
