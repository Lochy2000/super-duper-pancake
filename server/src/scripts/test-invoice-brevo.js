require('dotenv').config();
const emailService = require('../services/email.service');

// Create a sample invoice for testing
const sampleInvoice = {
  invoiceNumber: 'TEST-1001',
  clientName: 'Test Client',
  clientEmail: process.env.EMAIL_FROM, // Send to yourself by default
  items: [
    { description: 'Web Development Services', quantity: 1, price: 1500 },
    { description: 'Hosting Setup', quantity: 1, price: 200 },
    { description: 'Content Management System', quantity: 1, price: 300 }
  ],
  subtotal: 2000,
  tax: 200,
  total: 2200,
  status: 'unpaid',
  dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
  createdAt: new Date().toISOString()
};

async function sendTestInvoice() {
  console.log('Sending test invoice email to:', sampleInvoice.clientEmail);
  console.log('Using Brevo SMTP configuration');
  
  try {
    const result = await emailService.sendInvoiceCreatedEmail(sampleInvoice);
    
    if (result) {
      console.log('✅ Test invoice email sent successfully!');
    } else {
      console.error('❌ Failed to send test invoice email.');
    }
  } catch (error) {
    console.error('Error sending test invoice email:', error);
  }
}

// Execute the function
sendTestInvoice();
