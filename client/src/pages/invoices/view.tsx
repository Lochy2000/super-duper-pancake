import React, { useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import Head from 'next/head';

const ViewInvoice: NextPage = () => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceNumber.trim()) {
      router.push(`/invoices/${invoiceNumber}`);
    }
  };

  return (
    <Layout>
      <Head>
        <title>View Invoice | Invoice System</title>
      </Head>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto card">
          <h1 className="text-2xl font-bold text-center mb-6">View Your Invoice</h1>
          <p className="text-gray-600 mb-6 text-center">
            Enter your invoice number to view and pay your invoice
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <input
                id="invoiceNumber"
                type="text"
                className="form-input"
                placeholder="e.g. INV-1001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="btn-primary w-full">
              View Invoice
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ViewInvoice;
