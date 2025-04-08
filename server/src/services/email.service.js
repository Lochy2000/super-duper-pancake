const { Resend } = require('resend');
const config = require('../config/env');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Flag to control email sending (useful for testing)
const SEND_EMAILS = true;

/**
 * Safely send an email, with error handling
 * @param {Object} mailOptions The email options
 * @returns {Promise<boolean>} Success status
 */
const safelySendEmail = async (mailOptions) => {
  if (!SEND_EMAILS) {
    console.log('Email sending is disabled');
    return true;
  }

  try {
    const { from, to, subject, html, text } = mailOptions;
    await resend.emails.send({
      from: from || process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text
    });
    console.log('Email sent successfully');
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
const sendInvoiceCreatedEmail = async (invoice, toEmail = null) => {
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
      `,
      text: `
Invoice #${invoice.invoiceNumber}

Dear ${invoice.clientName},

We hope this email finds you well. Please find attached your invoice with the details below:

Invoice Number: ${invoice.invoiceNumber}
Due Date: ${dueDate}
Total Amount: $${invoice.total.toFixed(2)}

Description | Quantity | Price | Amount
${itemsList.replace(/<tr>/g, '').replace(/<\/tr>/g, '').replace(/<td>/g, '').replace(/<\/td>/g, '')}

Subtotal: $${invoice.subtotal.toFixed(2)}
Tax: $${invoice.tax.toFixed(2)}
Total: $${invoice.total.toFixed(2)}

You can view and pay your invoice at: ${paymentUrl}

If you have any questions or concerns regarding this invoice, please don't hesitate to contact us.

Thank you for your business!

Best regards,
Your Company Name
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
const sendPaymentConfirmationEmail = async (invoice) => {
  try {
    
    // Create invoice view link
    const invoiceUrl = `${config.frontendUrl}/invoices/${invoice.invoiceNumber}`;
    
    // Format payment method
    const paymentMethod = invoice.paymentMethod === 'stripe' ? 'Credit Card' : 
                         invoice.paymentMethod === 'paypal' ? 'PayPal' : 'Other';
    
    // Email content
    const mailOptions = {
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
      `,
      text: `
Payment Confirmation

Dear ${invoice.clientName},

Thank you for your payment. This email confirms that we have received your payment for invoice #${invoice.invoiceNumber}.

Invoice Number: ${invoice.invoiceNumber}
Payment Date: ${new Date().toLocaleDateString()}
Payment Method: ${paymentMethod}
Amount: $${invoice.total.toFixed(2)}
Transaction ID: ${invoice.transactionId || 'N/A'}

You can view your invoice at: ${invoiceUrl}

If you have any questions or concerns regarding this payment, please don't hesitate to contact us.

Thank you for your business!

Best regards,
Your Company Name
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
const sendInvoiceReminderEmail = async (invoice) => {
  try {
    
    // Format due date
    const dueDate = new Date(invoice.dueDate).toLocaleDateString();
    
    // Create invoice payment link
    const paymentUrl = `${config.frontendUrl}/invoices/${invoice.invoiceNumber}`;
    
    // Determine if invoice is overdue
    const isOverdue = new Date(invoice.dueDate) < new Date();
    
    // Email content
    const mailOptions = {
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
      `,
      text: `
${isOverdue ? 'INVOICE OVERDUE' : 'PAYMENT REMINDER'}

Dear ${invoice.clientName},

${isOverdue 
  ? `This is a reminder that your payment for invoice #${invoice.invoiceNumber} is overdue. The payment was due on ${dueDate}.` 
  : `This is a friendly reminder that the payment for invoice #${invoice.invoiceNumber} is due on ${dueDate}.`}

Invoice Number: ${invoice.invoiceNumber}
Due Date: ${dueDate}
Total Amount: $${invoice.total.toFixed(2)}

You can view and pay your invoice at: ${paymentUrl}

If you have already made this payment, please disregard this reminder. If you have any questions or concerns, please don't hesitate to contact us.

Thank you for your prompt attention to this matter.

Best regards,
Your Company Name
      `
    };
    
    // Send email
    return await safelySendEmail(mailOptions);
  } catch (error) {
    console.error('Error preparing reminder email:', error);
    return false;
  }
};

module.exports = {
  sendInvoiceCreatedEmail,
  sendPaymentConfirmationEmail,
  sendInvoiceReminderEmail
};
