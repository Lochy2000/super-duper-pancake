require('dotenv').config();
const brevoEmailService = require('../services/brevo-email.service');

// Test email function
async function testBrevoEmail() {
  console.log('Testing Brevo email service...');
  
  if (!process.env.BREVO_API_KEY) {
    console.error('Error: BREVO_API_KEY not set in .env file');
    console.error('Please sign up at https://www.brevo.com and get an API key');
    return;
  }
  
  const recipient = process.env.TEST_EMAIL || process.env.EMAIL_FROM;
  
  if (!recipient) {
    console.error('Error: No recipient email address specified');
    console.error('Please set EMAIL_FROM or TEST_EMAIL in your .env file');
    return;
  }
  
  console.log(`Attempting to send test email to ${recipient}...`);
  
  try {
    const result = await brevoEmailService.sendTestEmail(recipient);
    
    if (result) {
      console.log('✅ Test email sent successfully!');
      console.log('Check your inbox to confirm receipt.');
    } else {
      console.error('❌ Failed to send test email.');
    }
  } catch (error) {
    console.error('Error sending test email:', error);
  }
}

// Run the test
testBrevoEmail();
