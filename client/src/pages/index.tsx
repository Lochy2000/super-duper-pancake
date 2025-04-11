import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

const Home: NextPage = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const handleMouseMove = (e: MouseEvent) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      cursor.classList.add('active');
    };

    const handleMouseLeave = () => {
      cursor.classList.remove('active');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="min-h-screen grid-background text-white">
      <div className="grid-cursor" ref={cursorRef}></div>
      <Head>
        <title>Easy Web | Invoice Portal</title>
        <meta name="description" content="Easy Web Invoice Management System" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <main>
        <div className="relative">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-8">
                <div className="m2">
                  <span className="logo">EW</span>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">Web Development Solutions</h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Transform your vision into reality with our expert web development services. We build beautiful, functional websites that help your business grow.
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="dark-card rounded-lg p-8 hover:border-purple-500 transition-all duration-300">
                <h2 className="text-2xl font-bold text-white mb-4">Invoice Portal</h2>
                <p className="text-gray-300 mb-6">
                  View and pay your invoices securely through our payment portal. Track your payments and manage your billing in one place.
                </p>
                <Link 
                  href="/invoices/view" 
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors"
                >
                  View Invoices
                </Link>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
            <div className="relative">
              <div className="animate-marquee whitespace-nowrap">
                <span className="mx-4 text-purple-400">we dev mobile apps</span>
                <span className="mx-4 text-blue-400">we dev desktop apps</span>
                <span className="mx-4 text-indigo-400">we dev websites</span>
                <span className="mx-4 text-violet-400">we dev e-commerce</span>
                <span className="mx-4 text-purple-400">we dev onepages</span>
                <span className="mx-4 text-blue-400">we dev blogs</span>
                <span className="mx-4 text-indigo-400">we dev portfolios</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
