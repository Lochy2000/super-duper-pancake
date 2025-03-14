require('dotenv').config();
const nodemailer = require('nodemailer');

// Test email function
async function testBrevoSmtp() {
  console.log('Testing Brevo SMTP email configuration...');
  
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM } = process.env;
  
  // Verify that required values are present
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASSWORD) {
    console.error('Error: Missing email configuration in .env file');
    console.error('Required variables: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD');
    return;
  }

  console.log('Creating email transporter with the following configuration:');
  console.log(`Host: ${EMAIL_HOST}`);
  console.log(`Port: ${EMAIL_PORT}`);
  console.log(`User: ${EMAIL_USER}`);
  console.log(`From: ${EMAIL_FROM || EMAIL_USER}`);
  
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      }
    });

    // Verify connection
    console.log('Verifying connection to SMTP server...');
    await transporter.verify();
    console.log('SMTP server connection successful!');

    // Test email content
    const mailOptions = {
      from: EMAIL_FROM || EMAIL_USER, 
      to: EMAIL_FROM, // Send to yourself for testing
      subject: 'Invoice App SMTP Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333;">Email Test Successful</h1>
          </div>
          
          <div style="padding: 20px;">
            <p>This email confirms that your Invoice App email configuration with Brevo SMTP is working correctly.</p>
            <p>You can now send invoice notifications and payment confirmations.</p>
            
            <div style="margin: 20px 0; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
              <p><strong>Test sent at:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>Best regards,<br>Your Invoice App</p>
          </div>
        </div>
      `
    };

    console.log('Attempting to send test email...');
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);

    return true;
  } catch (error) {
    console.error('❌ Error sending email:');
    console.error(error);
    
    // Provide more detailed troubleshooting information
    if (error.code === 'EAUTH') {
      console.log('\nAuthentication Error: Your username or password was not accepted.');
      console.log('Double-check your EMAIL_USER and EMAIL_PASSWORD in the .env file.');
    } else if (error.code === 'ESOCKET') {
      console.log('\nConnection Error: Could not connect to the email server.');
      console.log('Check your EMAIL_HOST and EMAIL_PORT settings.');
    }
    
    return false;
  }
}

// Run the test
testBrevoSmtp();
