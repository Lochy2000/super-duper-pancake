require('dotenv').config();
const brevoService = require('../services/brevo.service');

async function testBrevoInvoiceEmail() {
  console.log('Testing Brevo API invoice email...');
  
  const { BREVO_API_KEY, EMAIL_FROM } = process.env;
  
  if (!BREVO_API_KEY) {
    console.error('Error: BREVO_API_KEY not set in .env file');
    console.error('Please generate an API key in your Brevo account and add it to your .env file');
    return;
  }

  try {
    console.log('Sending test invoice email to:', EMAIL_FROM);
    const result = await brevoService.sendTestInvoiceEmail();
    
    if (result) {
      console.log('✅ Test invoice email sent successfully!');
      console.log('Check your inbox for the invoice email.');
    } else {
      console.error('❌ Failed to send test invoice email.');
    }
    
    return result;
  } catch (error) {
    console.error('Error sending test invoice email:', error);
    return false;
  }
}

// Run the test
testBrevoInvoiceEmail();
