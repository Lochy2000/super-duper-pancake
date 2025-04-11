import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const services = [
  {
    title: 'Search Engine Optimization (SEO)',
    description: 'Boost your online visibility and attract more customers with our expert SEO services.'
  },
  {
    title: 'Payment Dashboards',
    description: 'Track your business finances with our custom payment analytics and reporting solutions.'
  },
  {
    title: 'Email Integration',
    description: 'Seamless email marketing and automation to keep your customers engaged.'
  },
  {
    title: 'Hosting Management',
    description: 'Worry-free website hosting with 24/7 monitoring and maintenance.'
  },
  {
    title: 'Website Updates',
    description: 'Keep your website fresh and current with our regular update services.'
  },
  {
    title: 'Digital Advertising',
    description: 'Targeted advertising campaigns to reach your ideal customers.'
  }
];

const PaymentSuccess = () => {
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
    <div className="min-h-screen grid-background text-white relative overflow-hidden">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
      <div className="grid-cursor" ref={cursorRef} />
      
      <Head>
        <title>Payment Successful | Easy Web</title>
        <meta name="description" content="Payment successfully processed" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <Layout>
        <div className="container mx-auto px-4 py-16 relative z-10">
          {/* Success Message */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <div className="rounded-full bg-purple-500/20 p-4 backdrop-blur-sm">
                <CheckCircleIcon className="h-16 w-16 text-purple-400" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600">
              Thank You!
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-4">
              Your payment has been processed successfully.
            </p>
            <p className="text-gray-400 text-lg">
              A confirmation email has been sent to your inbox.
            </p>
          </div>

          {/* Services Section */}
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600">
                Discover More Services from Easy Web
              </h2>
              <p className="text-gray-300 max-w-2xl mx-auto text-lg">
                Take your online presence to the next level with our comprehensive web solutions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <div 
                  key={index} 
                  className="rounded-xl bg-gray-900/50 backdrop-blur-sm p-6 border border-gray-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                >
                  <h3 className="text-xl font-semibold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600">
                    {service.title}
                  </h3>
                  <p className="text-gray-300">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Contact Section */}
            <div className="text-center mt-16">
              <h3 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600">
                Need Help?
              </h3>
              <p className="text-gray-300 mb-6 text-lg">
                Our team is here to assist you with any questions or concerns.
              </p>
              <a
                href="mailto:info@easywebs.uk"
                className="inline-block bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 font-semibold backdrop-blur-sm"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
};

export default PaymentSuccess; 