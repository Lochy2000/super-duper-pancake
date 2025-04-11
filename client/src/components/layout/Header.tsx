import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const Header: React.FC = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  
  // Check if user is logged in on component mount
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsLoggedIn(false);
    router.push('/');
  };

  return (
    <header className="bg-[#0a0a0f] border-b border-purple-900/10">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="m2" style={{ width: '40px', height: '40px' }}>
              <span className="logo" style={{ fontSize: '14px' }}>EW</span>
            </div>
            <span className="font-bold text-xl text-purple-500">easy web</span>
          </Link>
          
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link href="/" className="text-gray-300 hover:text-purple-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/invoices/view" className="text-gray-300 hover:text-purple-400 transition-colors">
                  View Invoice
                </Link>
              </li>
              {isLoggedIn && (
                <li>
                  <button 
                    onClick={handleLogout}
                    className="text-gray-300 hover:text-purple-400 transition-colors"
                  >
                    Logout
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
