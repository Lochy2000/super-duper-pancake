const { Resend } = require('resend');
const emailService = require('../../src/services/email.service');

// Mock Resend
jest.mock('resend');

describe('Email Service', () => {
  let mockResend;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResend = new Resend();
    mockResend.emails.send.mockResolvedValue({ id: 'mock-email-id', success: true });
  });

  describe('sendInvoiceEmail', () => {
    it('should send an invoice email successfully', async () => {
      const mockInvoice = {
        id: 'test-invoice-id',
        invoice_number: 'INV-2025-001',
        client_name: 'Test Client',
        total: 1540,
        due_date: '2025-04-25',
        items: [
          { description: 'Web Development', quantity: 10, price: 100 },
          { description: 'Design', quantity: 5, price: 80 }
        ],
        subtotal: 1400,
        tax: 140
      };

      const mockSender = {
        company_name: 'Test Company',
        email: 'sender@example.com'
      };

      const result = await emailService.sendInvoiceEmail(
        'recipient@example.com',
        mockInvoice,
        mockSender,
        'http://localhost:3000/invoices/INV-2025-001'
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('mock-email-id');
      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: expect.any(String),
        to: 'recipient@example.com',
        subject: expect.stringContaining('Invoice'),
        html: expect.stringContaining('INV-2025-001')
      });
    });

    it('should handle errors when sending fails', async () => {
      // Mock a failure
      mockResend.emails.send.mockRejectedValue(new Error('Failed to send email'));

      const mockInvoice = {
        id: 'test-invoice-id',
        invoice_number: 'INV-2025-001',
        client_name: 'Test Client',
        total: 1540,
        due_date: '2025-04-25',
        items: [{ description: 'Service', quantity: 1, price: 1540 }],
        subtotal: 1400,
        tax: 140
      };

      const mockSender = {
        company_name: 'Test Company',
        email: 'sender@example.com'
      };

      await expect(emailService.sendInvoiceEmail(
        'recipient@example.com',
        mockInvoice,
        mockSender,
        'http://localhost:3000/invoices/INV-2025-001'
      )).rejects.toThrow('Failed to send email');
    });
  });

  describe('sendPaymentConfirmationEmail', () => {
    it('should send a payment confirmation email successfully', async () => {
      const mockInvoice = {
        id: 'test-invoice-id',
        invoice_number: 'INV-2025-001',
        client_name: 'Test Client',
        total: 1540
      };

      const mockSender = {
        company_name: 'Test Company',
        email: 'sender@example.com'
      };

      const result = await emailService.sendPaymentConfirmationEmail(
        'recipient@example.com',
        mockInvoice,
        mockSender
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('mock-email-id');
      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: expect.any(String),
        to: 'recipient@example.com',
        subject: expect.stringContaining('Payment Confirmation'),
        html: expect.stringContaining('INV-2025-001')
      });
    });
  });

  describe('sendPaymentReminderEmail', () => {
    it('should send a payment reminder email successfully', async () => {
      const mockInvoice = {
        id: 'test-invoice-id',
        invoice_number: 'INV-2025-001',
        client_name: 'Test Client',
        total: 1540,
        due_date: '2025-04-25'
      };

      const mockSender = {
        company_name: 'Test Company',
        email: 'sender@example.com'
      };

      const result = await emailService.sendPaymentReminderEmail(
        'recipient@example.com',
        mockInvoice,
        mockSender,
        'http://localhost:3000/invoices/INV-2025-001'
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('mock-email-id');
      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: expect.any(String),
        to: 'recipient@example.com',
        subject: expect.stringContaining('Payment Reminder'),
        html: expect.stringContaining('INV-2025-001')
      });
    });
  });
});
