import type { NextApiRequest, NextApiResponse } from 'next';

// This route returns the available payment methods for the application
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return hardcoded available payment methods
    // In a production environment, this might come from a database or config
    const paymentMethods = [
      {
        id: 'stripe',
        name: 'stripe'
      },
      {
        id: 'paypal',
        name: 'paypal'
      }
    ];

    return res.status(200).json(paymentMethods);
  } catch (error: any) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 