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
    <div className="min-h-screen grid-background text-white">
      <div className="grid-cursor" ref={cursorRef}></div>
      <Head>
        <title>Payment Successful | Easy Web</title>
        <meta name="description" content="Payment successfully processed" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <Layout>
        <div className="container mx-auto px-4 py-16">
          {/* Success Message */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <div className="m2">
                <CheckCircleIcon className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Thank You!</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-2">
              Your payment has been processed successfully.
            </p>
            <p className="text-gray-400">
              A confirmation email has been sent to your inbox.
            </p>
          </div>

          {/* Services Section */}
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Discover More Services from Easy Web
              </h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Take your online presence to the next level with our comprehensive web solutions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <div key={index} className="service-card">
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {service.title}
                  </h3>
                  <p className="text-gray-300">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Contact Section */}
            <div className="text-center mt-12">
              <h3 className="text-2xl font-bold text-white mb-4">Need Help?</h3>
              <p className="text-gray-300 mb-6">
                Our team is here to assist you with any questions or concerns.
              </p>
              <a
                href="mailto:info@easywebs.uk"
                className="inline-block bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors"
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