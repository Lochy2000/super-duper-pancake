require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

async function testBrevoApiCustom() {
  console.log('Testing Brevo API email sending with custom subject...');
  
  const { BREVO_API_KEY, EMAIL_FROM } = process.env;
  
  if (!BREVO_API_KEY) {
    console.error('Error: BREVO_API_KEY not set in .env file');
    console.error('Please generate an API key in your Brevo account and add it to your .env file');
    return;
  }

  if (!EMAIL_FROM) {
    console.error('Error: EMAIL_FROM not set in .env file');
    console.error('Please set the email address you want to send from');
    return;
  }
  
  try {
    console.log('Setting up Brevo API client...');
    
    // Configure API key authorization
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = BREVO_API_KEY;
    
    // Create the TransactionalEmailsApi instance
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    
    // Create a unique timestamp for the subject
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const customSubject = `INVOICE APP TEST ${timestamp}`;
    
    // Create a test email
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = customSubject;
    sendSmtpEmail.htmlContent = `
      <html>
        <body>
          <h1>Brevo API Test Successful!</h1>
          <p>This is a test email with a unique subject line: ${customSubject}</p>
          <p>This email was sent using Brevo's API at ${new Date().toLocaleString()}.</p>
          <p>If you're seeing this, it means your API key is working correctly and your invoice app can now send emails!</p>
        </body>
      </html>
    `;
    sendSmtpEmail.sender = { name: 'Invoice App Test', email: EMAIL_FROM };
    sendSmtpEmail.to = [{ email: EMAIL_FROM }];
    
    console.log('Attempting to send email...');
    console.log(`Subject: ${customSubject}`);
    console.log(`From: ${EMAIL_FROM}`);
    console.log(`To: ${EMAIL_FROM}`);
    
    // Send the email
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Email sent successfully!');
    console.log('MessageId:', data.messageId);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send email using Brevo API:');
    console.error(error);
    
    if (error.response && error.response.body) {
      console.error('API error details:', error.response.body);
    }
    
    return false;
  }
}

// Run the test
testBrevoApiCustom();
