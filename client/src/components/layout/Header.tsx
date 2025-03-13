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
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="font-bold text-xl text-primary-600">
            Invoice System
          </Link>
          
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link href="/" className="text-gray-600 hover:text-primary-600">
                  Home
                </Link>
              </li>
              {isLoggedIn ? (
                <>
                  <li>
                    <Link href="/admin/dashboard" className="text-gray-600 hover:text-primary-600">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/profile" className="text-gray-600 hover:text-primary-600">
                      Profile
                    </Link>
                  </li>
                  <li>
                    <button 
                      onClick={handleLogout}
                      className="text-gray-600 hover:text-primary-600"
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link href="/admin/login" className="text-gray-600 hover:text-primary-600">
                    Admin Login
                  </Link>
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
