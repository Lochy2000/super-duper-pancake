require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

async function checkBrevoSender() {
  console.log('Checking Brevo sender information...');
  
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
    
    // Create API instance
    const senderApi = new SibApiV3Sdk.SendersApi();
    
    try {
      // Get the list of senders
      console.log('Retrieving list of senders...');
      const data = await senderApi.getSenders();
      
      console.log('Registered Senders:');
      if (data.senders && data.senders.length > 0) {
        data.senders.forEach((sender, index) => {
          console.log(`Sender ${index + 1}:`);
          console.log(`  Email: ${sender.email}`);
          console.log(`  Name: ${sender.name}`);
          console.log(`  ID: ${sender.id}`);
          console.log(`  Status: ${sender.active ? 'Active' : 'Inactive'}`);
          if (sender.ips) {
            console.log(`  IPs: ${sender.ips.join(', ')}`);
          }
          console.log('');
        });
        
        // Check if our current sender is registered
        const currentSender = data.senders.find(s => s.email === EMAIL_FROM);
        if (currentSender) {
          console.log(`✅ Your sender email (${EMAIL_FROM}) is registered in Brevo.`);
          console.log(`Status: ${currentSender.active ? 'Active' : 'Inactive'}`);
          
          if (!currentSender.active) {
            console.log('⚠️ Your sender email is registered but not active. This might be why emails are not being delivered.');
            console.log('Please check your Brevo dashboard to activate this sender.');
          }
        } else {
          console.log(`❌ Your sender email (${EMAIL_FROM}) is NOT registered in Brevo.`);
          console.log('This might be why emails are not being delivered.');
          console.log('Please add and verify this sender in your Brevo dashboard.');
        }
      } else {
        console.log('No senders found. You need to add a sender in your Brevo dashboard.');
      }
    } catch (err) {
      console.error('Could not retrieve sender information:', err);
      if (err.response && err.response.body) {
        console.error('API error details:', err.response.body);
      }
    }
  } catch (error) {
    console.error('Error checking sender information:', error);
  }
}

// Run the check
checkBrevoSender();
