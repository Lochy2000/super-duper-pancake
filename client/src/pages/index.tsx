import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Invoice System | Home</title>
        <meta name="description" content="Custom invoice management system" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Invoice Management System</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create, send, and manage invoices. Accept payments through multiple payment gateways.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Client Portal</h2>
            <p className="text-gray-600 mb-6">
              View and pay your invoices securely through our payment portal.
            </p>
            <Link href="/invoices/view" className="btn-primary inline-block">
              View Invoices
            </Link>
          </div>
          
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Dashboard</h2>
            <p className="text-gray-600 mb-6">
              Create invoices, track payments, and manage your clients.
            </p>
            <Link href="/admin/login" className="btn-primary inline-block">
              Admin Login
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500">
          &copy; {new Date().getFullYear()} Your Company Name. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;
