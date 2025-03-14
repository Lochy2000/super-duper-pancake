const SibApiV3Sdk = require('sib-api-v3-sdk');
const config = require('../config/env');

/**
 * Initialize Brevo API client
 * @returns {Object} Brevo API instance
 */
const initBrevoApi = () => {
  // Configure API key authorization
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = config.email.brevoApiKey;
  
  // Create API instance
  return new SibApiV3Sdk.TransactionalEmailsApi();
};

/**
 * Send an email using Brevo API
 * @param {Object} options Email options (to, subject, html content)
 * @returns {Promise<boolean>} Success status
 */
exports.sendEmail = async (options) => {
  const { to, subject, html, from = config.email.from } = options;
  
  if (!config.email.brevoApiKey) {
    console.error('Brevo API key not configured. Cannot send email.');
    return false;
  }
  
  try {
    // Initialize API
    const apiInstance = initBrevoApi();
    
    // Create email
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = { name: 'Invoice System', email: from };
    sendSmtpEmail.to = [{ email: to }];
    
    // Add reply-to if configured
    if (config.email.replyTo) {
      sendSmtpEmail.replyTo = { email: config.email.replyTo };
    }
    
    console.log(`Sending email to ${to} using Brevo API...`);
    
    // Send email
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log(`Email sent successfully to ${to}`);
    console.log(`Message ID: ${data.messageId}`);
    
    return true;
  } catch (error) {
    console.error('Error sending email with Brevo API:', error);
    
    if (error.response && error.response.body) {
      console.error('API error details:', error.response.body);
    }
    
    return false;
  }
};

/**
 * Send email with invoice details
 * @param {Object} invoice The invoice object
 * @param {String} toEmail Override the client email if needed
 */
exports.sendInvoiceEmail = async (invoice, toEmail = null) => {
  try {
    // Format due date
    const dueDate = new Date(invoice.dueDate).toLocaleDateString();
    
    // Format invoice items
    const itemsList = invoice.items.map(item => {
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `;
    }).join('');
    
    // Create invoice payment link
    const paymentUrl = `${config.frontendUrl}/invoices/${invoice.invoiceNumber}`;
    
    // Send the email
    return await exports.sendEmail({
      to: toEmail || invoice.clientEmail,
      subject: `Invoice #${invoice.invoiceNumber} from Your Company Name`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333;">Invoice #${invoice.invoiceNumber}</h1>
          </div>
          
          <div style="padding: 20px;">
            <p>Dear ${invoice.clientName},</p>
            
            <p>We hope this email finds you well. Please find attached your invoice with the details below:</p>
            
            <div style="margin: 20px 0; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><strong>Total Amount:</strong> $${invoice.total.toFixed(2)}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: left;">Description</th>
                  <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: center;">Quantity</th>
                  <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Price</th>
                  <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
                  <td style="padding: 8px; text-align: right;">$${invoice.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="padding: 8px; text-align: right;"><strong>Tax:</strong></td>
                  <td style="padding: 8px; text-align: right;">$${invoice.tax.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="padding: 8px; text-align: right; border-top: 2px solid #ddd;"><strong>Total:</strong></td>
                  <td style="padding: 8px; text-align: right; border-top: 2px solid #ddd;">$${invoice.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="margin: 20px 0; text-align: center;">
              <a href="${paymentUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View and Pay Invoice</a>
            </div>
            
            <p>If you have any questions or concerns regarding this invoice, please don't hesitate to contact us.</p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>Your Company Name</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Error preparing invoice email:', error);
    return false;
  }
};

/**
 * Send test email using Brevo API
 * @param {String} to Recipient email
 * @returns {Promise<boolean>} Success status
 */
exports.sendTestEmail = async (to) => {
  return await exports.sendEmail({
    to,
    subject: 'Brevo API Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333;">Email Test Successful</h1>
        </div>
        
        <div style="padding: 20px;">
          <p>This email confirms that your Invoice App email configuration with Brevo API is working correctly.</p>
          <p>You can now send invoice notifications and payment confirmations.</p>
          
          <div style="margin: 20px 0; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
            <p><strong>Test sent at:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>Best regards,<br>Your Invoice App</p>
        </div>
      </div>
    `
  });
};

/**
 * Send test invoice email using Brevo API
 */
exports.sendTestInvoiceEmail = async () => {
  // Create a sample invoice for testing
  const sampleInvoice = {
    invoiceNumber: 'TEST-1001',
    clientName: 'Test Client',
    clientEmail: config.email.from, // Send to yourself by default
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

  console.log('Sending test invoice email to:', sampleInvoice.clientEmail);
  return await exports.sendInvoiceEmail(sampleInvoice);
};
