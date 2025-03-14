require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

async function checkEmailEvents() {
  console.log('Checking recent Brevo email events...');
  
  const { BREVO_API_KEY, EMAIL_FROM } = process.env;
  
  if (!BREVO_API_KEY) {
    console.error('Error: BREVO_API_KEY not set in .env file');
    return;
  }

  try {
    // Configure API key authorization
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = BREVO_API_KEY;
    
    // Create API instance for retrieving email events
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    
    // Calculate dates for filtering (last 24 hours)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 24);
    
    console.log(`Checking email events from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Looking for emails sent to/from: ${EMAIL_FROM}`);
    
    // Get events
    try {
      // Some versions of the API use getEmailEventReport
      const data = await apiInstance.getEmailEventReport({
        email: EMAIL_FROM,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 50
      });
      
      console.log('Email Events:');
      if (data.events && data.events.length > 0) {
        data.events.forEach(event => {
          console.log(`- [${event.date}] ${event.type}: ${event.email} - Subject: "${event.subject}"`);
        });
      } else {
        console.log('No email events found for your address in the last 24 hours.');
      }
    } catch (err) {
      // If that fails, try getTransacEmailsList
      try {
        console.log('Trying alternative API method...');
        const data = await apiInstance.getTransacEmailsList({
          email: EMAIL_FROM,
          templateId: null,
          messageId: null,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          sort: 'desc',
          limit: 50
        });
        
        console.log('Email Events:');
        if (data.transactionalEmails && data.transactionalEmails.length > 0) {
          data.transactionalEmails.forEach(email => {
            console.log(`- [${email.createdAt}] To: ${email.email} - Subject: "${email.subject}" - Status: ${email.status}`);
          });
        } else {
          console.log('No email events found for your address in the last 24 hours.');
        }
      } catch (err2) {
        console.error('Could not retrieve email events using either method:');
        console.error(err2);
      }
    }
  } catch (error) {
    console.error('Error checking email events:', error);
  }
}

// Run the check
checkEmailEvents();
