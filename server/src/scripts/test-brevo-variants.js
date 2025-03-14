require('dotenv').config();
const nodemailer = require('nodemailer');

// Test function with multiple authentication variants
async function testBrevoVariants() {
  console.log('Testing Brevo SMTP with multiple authentication methods...');
  
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM } = process.env;
  
  // Verify that required values are present
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASSWORD) {
    console.error('Error: Missing email configuration in .env file');
    console.error('Required variables: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD');
    return;
  }

  // Attempt multiple configurations to find one that works
  const configs = [
    {
      name: "Standard SMTP",
      config: {
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: false,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD
        }
      }
    },
    {
      name: "Using Master Password directly",
      config: {
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: false,
        auth: {
          user: EMAIL_USER,
          pass: "Master Password" // Replace with actual value if shown in dashboard
        }
      }
    },
    {
      name: "With TLS options",
      config: {
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: false,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: "Without SSL verification",
      config: {
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: false,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: "Alternate port (465)",
      config: {
        host: EMAIL_HOST,
        port: 465,
        secure: true,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD
        }
      }
    }
  ];

  // Try each configuration
  for (const attempt of configs) {
    console.log(`\nTrying method: ${attempt.name}`);
    console.log('Configuration:', JSON.stringify(attempt.config, null, 2));
    
    try {
      // Create a transporter with this config
      const transporter = nodemailer.createTransport(attempt.config);

      // Verify connection
      console.log('Verifying connection to SMTP server...');
      await transporter.verify();
      console.log('✅ CONNECTION SUCCESSFUL with this method!');
      
      // Try sending an email
      console.log('Attempting to send test email...');
      const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to: EMAIL_FROM,
        subject: `Brevo Test - ${attempt.name}`,
        html: `<p>This is a test email sent using "${attempt.name}" method.</p>
               <p>If you're seeing this, it worked!</p>`
      });
      
      console.log('✅ EMAIL SENT SUCCESSFULLY with this method!');
      console.log('Message ID:', info.messageId);
      console.log('\nUse this configuration for your application.');
      return;
    } catch (error) {
      console.error(`❌ Failed with method "${attempt.name}":`);
      console.error(error.message);
    }
  }

  console.log('\n❌ All authentication methods failed.');
  console.log('Please check your Brevo account for the correct credentials.');
  console.log('Alternatively, consider using the Brevo API approach instead of SMTP.');
}

// Run the test
testBrevoVariants();
