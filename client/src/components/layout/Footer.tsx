import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0a0a0f] border-t border-purple-900/10 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="m2" style={{ width: '40px', height: '40px' }}>
              <span className="logo" style={{ fontSize: '14px' }}>EW</span>
            </div>
            <span className="font-bold text-purple-500">easy web</span>
          </div>
          
          <div className="flex space-x-6 mb-4 md:mb-0">
            <Link href="/" className="text-gray-300 hover:text-purple-400 transition-colors">
              Home
            </Link>
            <Link href="/invoices/view" className="text-gray-300 hover:text-purple-400 transition-colors">
              View Invoice
            </Link>
            <a href="mailto:info@easywebs.uk" className="text-gray-300 hover:text-purple-400 transition-colors">
              Contact
            </a>
          </div>
          
          <div className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Easy Web. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
