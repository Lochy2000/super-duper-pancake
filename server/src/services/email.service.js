const nodemailer = require('nodemailer');
const config = require('../config/env');

// Flag to control email sending (useful for testing)
const SEND_EMAILS = true;

// Create nodemailer transporter
const getTransporter = () => {
  // Check if SendGrid API key is available
  if (config.email.sendgridApiKey) {
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: config.email.sendgridApiKey
      }
    });
  }
  
  // Fallback to standard SMTP
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.password
    }
  });
};

/**
 * Safely send an email, with error handling
 * @param {Object} mailOptions The nodemailer mail options
 * @returns {Promise<boolean>} Success status
 */
const safelySendEmail = async (mailOptions) => {
  // Skip sending if disabled
  if (!SEND_EMAILS) {
    console.log('Email sending is disabled. Would have sent to:', mailOptions.to);
    console.log('Email subject:', mailOptions.subject);
    return true;
  }
  
  try {
    // Skip if email config is not set
    if (!config.email.host && !config.email.sendgridApiKey) {
      console.log('Email configuration not set. Skipping email notification.');
      return false;
    }
    
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${mailOptions.to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

/**
 * Send email with invoice details when a new invoice is created
 * @param {Object} invoice The invoice object
 * @param {String} toEmail Override the client email if needed
 */
exports.sendInvoiceCreatedEmail = async (invoice, toEmail = null) => {
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
    
    // Email content
    const mailOptions = {
      from: config.email.from,
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
    };
    
    // Send email using the helper function
    return await safelySendEmail(mailOptions);
  } catch (error) {
    console.error('Error preparing invoice email:', error);
    return false;
  }
};

/**
 * Send payment confirmation email when an invoice is paid
 * @param {Object} invoice The invoice object
 */
exports.sendPaymentConfirmationEmail = async (invoice) => {
  try {
    
    // Create invoice view link
    const invoiceUrl = `${config.frontendUrl}/invoices/${invoice.invoiceNumber}`;
    
    // Format payment method
    const paymentMethod = invoice.paymentMethod === 'stripe' ? 'Credit Card' : 
                         invoice.paymentMethod === 'paypal' ? 'PayPal' : 'Other';
    
    // Email content
    const mailOptions = {
      from: config.email.from,
      to: invoice.clientEmail,
      subject: `Payment Confirmation for Invoice #${invoice.invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333;">Payment Confirmation</h1>
          </div>
          
          <div style="padding: 20px;">
            <p>Dear ${invoice.clientName},</p>
            
            <p>Thank you for your payment. This email confirms that we have received your payment for invoice #${invoice.invoiceNumber}.</p>
            
            <div style="margin: 20px 0; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod}</p>
              <p><strong>Amount:</strong> $${invoice.total.toFixed(2)}</p>
              <p><strong>Transaction ID:</strong> ${invoice.transactionId || 'N/A'}</p>
            </div>
            
            <div style="margin: 20px 0; text-align: center;">
              <a href="${invoiceUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Invoice</a>
            </div>
            
            <p>If you have any questions or concerns regarding this payment, please don't hesitate to contact us.</p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>Your Company Name</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    // Send email
    return await safelySendEmail(mailOptions);
  } catch (error) {
    console.error('Error preparing payment confirmation email:', error);
    return false;
  }
};

/**
 * Send invoice reminder for an unpaid invoice
 * @param {Object} invoice The invoice object
 */
exports.sendInvoiceReminderEmail = async (invoice) => {
  try {
    
    // Format due date
    const dueDate = new Date(invoice.dueDate).toLocaleDateString();
    
    // Create invoice payment link
    const paymentUrl = `${config.frontendUrl}/invoices/${invoice.invoiceNumber}`;
    
    // Determine if invoice is overdue
    const isOverdue = new Date(invoice.dueDate) < new Date();
    
    // Email content
    const mailOptions = {
      from: config.email.from,
      to: invoice.clientEmail,
      subject: isOverdue 
        ? `OVERDUE: Invoice #${invoice.invoiceNumber} Payment Required`
        : `Reminder: Invoice #${invoice.invoiceNumber} Due Soon`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${isOverdue ? '#dc3545' : '#ffc107'}; padding: 20px; text-align: center;">
            <h1 style="color: ${isOverdue ? 'white' : '#333'};">
              ${isOverdue ? 'INVOICE OVERDUE' : 'PAYMENT REMINDER'}
            </h1>
          </div>
          
          <div style="padding: 20px;">
            <p>Dear ${invoice.clientName},</p>
            
            <p>
              ${isOverdue 
                ? `This is a reminder that your payment for invoice #${invoice.invoiceNumber} is overdue. The payment was due on ${dueDate}.` 
                : `This is a friendly reminder that the payment for invoice #${invoice.invoiceNumber} is due on ${dueDate}.`}
            </p>
            
            <div style="margin: 20px 0; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><strong>Total Amount:</strong> $${invoice.total.toFixed(2)}</p>
            </div>
            
            <div style="margin: 20px 0; text-align: center;">
              <a href="${paymentUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View and Pay Invoice</a>
            </div>
            
            <p>If you have already made this payment, please disregard this reminder. If you have any questions or concerns, please don't hesitate to contact us.</p>
            
            <p>Thank you for your prompt attention to this matter.</p>
            
            <p>Best regards,<br>Your Company Name</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    // Send email
    return await safelySendEmail(mailOptions);
  } catch (error) {
    console.error('Error preparing reminder email:', error);
    return false;
  }
};
