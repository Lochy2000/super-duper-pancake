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
      from: from || process.env.EMAIL_FROM || 'Invoice System <noreply@easywebs.uk>',
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
 * Send email with invoice details and client login info when a new invoice is created
 * @param {Object} invoice The invoice object
 * @param {string | null} temporaryPassword The generated temporary password (null if client existed)
 * @param {boolean} clientExists Indicates if the client account already existed
 */
const sendInvoiceCreatedEmail = async (invoice, temporaryPassword, clientExists) => {
  try {
    const dueDate = new Date(invoice.due_date).toLocaleDateString();
    
    const itemsList = (invoice.items || []).map(item => {
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `;
    }).join('');
    
    // Define URLs using environment variables
    const baseUrl = process.env.FRONTEND_URL || config.frontendUrl;
    const clientLoginUrl = `${baseUrl}/client/login`;
    const invoiceUrl = `${baseUrl}/pay/${invoice.invoice_number}/${invoice.access_token}`;
    
    // --- Login Information Section ---
    let loginSectionHtml = '';
    let loginSectionText = '';

    if (temporaryPassword) {
      // New client account was created
      loginSectionHtml = `
        <div style="margin: 20px 0; padding: 15px; background-color: #e9ecef; border-left: 4px solid #007bff; color: #495057;">
          <h3 style="margin-top: 0; color: #0056b3;">Access Your Client Portal</h3>
          <p>A client portal account has been created for you. You can log in to view and manage your invoices, including changing your password.</p>
          <p>
            <strong>Login Page:</strong> <a href="${clientLoginUrl}">${clientLoginUrl}</a><br>
            <strong>Email:</strong> ${invoice.client_email}<br>
            <strong>Temporary Password:</strong> ${temporaryPassword}
          </p>
        </div>
      `;
      loginSectionText = `
Access Your Client Portal:
A client portal account has been created for you. You can log in to view and manage your invoices, including changing your password.
Login Page: ${clientLoginUrl}
Email: ${invoice.client_email}
Temporary Password: ${temporaryPassword}
      `;
    } else if (clientExists) {
      // Client already existed
      loginSectionHtml = `
        <div style="margin: 20px 0; padding: 15px; background-color: #e9ecef; border-left: 4px solid #17a2b8; color: #495057;">
          <h3 style="margin-top: 0; color: #0f5b68;">Access Your Client Portal</h3>
          <p>You can also log into your client portal to view and manage this invoice:</p>
          <p><a href="${clientLoginUrl}">${clientLoginUrl}</a></p>
        </div>
      `;
       loginSectionText = `
Access Your Client Portal:
You can also log into your client portal to view and manage this invoice:
${clientLoginUrl}
      `;
    }
    
    // Email content
    const mailOptions = {
      to: invoice.client_email,
      subject: `Invoice #${invoice.invoice_number} from Your Company Name`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333;">Invoice #${invoice.invoice_number}</h1>
          </div>
          
          <div style="padding: 20px;">
            <p>Dear ${invoice.client_name || 'Client'},</p> 
            
            <p>Thank you for your business. Please find your invoice details below:</p>
            
            <!-- Invoice Link Section -->
            <div style="margin: 20px 0; text-align: center;">
              <a href="${invoiceUrl}" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">View Invoice</a>
            </div>

            <div style="margin: 20px 0; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
              <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
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
            
            <!-- Login Info Section -->
            ${loginSectionHtml}
            <!-- End Login Info Section -->
            
            <p>If you have any questions, please contact us.</p>
            <p>Best regards,<br>Your Company Name</p>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Invoice #${invoice.invoice_number}

Dear ${invoice.client_name || 'Client'},

Thank you for your business. Please find your invoice details below.

View your invoice here:
${invoiceUrl}

Invoice Number: ${invoice.invoice_number}
Due Date: ${dueDate}
Total Amount: $${invoice.total.toFixed(2)}

--- Items ---
${(invoice.items || []).map(i => `${i.description} | Qty: ${i.quantity} | Price: $${i.price.toFixed(2)} | Amount: $${(i.quantity * i.price).toFixed(2)}`).join('\n')}
-------------
Subtotal: $${invoice.subtotal.toFixed(2)}
Tax: $${invoice.tax.toFixed(2)}
Total: $${invoice.total.toFixed(2)}

${loginSectionText}

If you have any questions, please contact us.

Best regards,
Your Company Name
      `
    };
    
    return await safelySendEmail(mailOptions);
  } catch (error) {
    console.error('Error preparing invoice created email:', error);
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
    const baseUrl = process.env.FRONTEND_URL || config.frontendUrl;
    const invoiceUrl = `${baseUrl}/invoices/${invoice.invoiceNumber}`;
    
    // Format payment method
    const paymentMethod = invoice.paymentMethod === 'stripe' ? 'Credit Card' : 'Other';
    
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
            
            <p>If you have any questions, please contact us.</p>
            <p>Best regards,<br>Your Company Name</p>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Payment Confirmation for Invoice #${invoice.invoiceNumber}

Dear ${invoice.clientName},

Thank you for your payment. This email confirms that we have received your payment for invoice #${invoice.invoiceNumber}.

Payment Details:
- Invoice Number: ${invoice.invoiceNumber}
- Payment Date: ${new Date().toLocaleDateString()}
- Payment Method: ${paymentMethod}
- Amount: $${invoice.total.toFixed(2)}
- Transaction ID: ${invoice.transactionId || 'N/A'}

You can view your invoice here:
${invoiceUrl}

If you have any questions, please contact us.

Best regards,
Your Company Name
      `
    };
    
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
