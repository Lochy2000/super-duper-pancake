import React from 'react';
import Link from 'next/link';

const PaymentSuccessPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 text-green-500 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="mb-6">Thank you for your payment. Your invoice has been processed.</p>
        <Link href="/invoices" legacyBehavior>
          <a className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-300">
            View Your Invoices
          </a>
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccessPage; 