const Invoice = require('../models/invoice.model');
const { ApiError } = require('../middleware/errorHandler');
const emailService = require('../services/email.service');

/**
 * @desc    Get all invoices
 * @route   GET /api/invoices
 * @access  Private
 */
exports.getInvoices = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.clientId) query.clientId = req.query.clientId;
    if (req.query.startDate) query.startDate = req.query.startDate;
    if (req.query.endDate) query.endDate = req.query.endDate;
    if (req.query.sortBy) query.sortBy = req.query.sortBy;
    if (req.query.sortOrder) query.sortOrder = req.query.sortOrder;

    const invoices = await Invoice.findByUser(req.user.id, query);

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single invoice by ID
 * @route   GET /api/invoices/:id
 * @access  Private
 */
exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      throw new ApiError('Invoice not found', 404);
    }

    // Check ownership
    if (invoice.user_id !== req.user.id) {
      throw new ApiError('Not authorized to access this invoice', 403);
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get invoice by invoice number (public access for client viewing)
 * @route   GET /api/invoices/public/:invoiceNumber
 * @access  Public
 */
exports.getInvoiceByNumber = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByNumber(req.params.invoiceNumber);
    
    if (!invoice) {
      throw new ApiError('Invoice not found', 404);
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new invoice
 * @route   POST /api/invoices
 * @access  Private
 */
exports.createInvoice = async (req, res, next) => {
  try {
    const { clientId, items, dueDate, notes } = req.body;

    // Calculate totals
    const { subtotal, tax, total } = await Invoice.calculateTotals(items);

    // Create invoice
    const invoice = await Invoice.create({
      user_id: req.user.id,
      client_id: clientId,
      due_date: dueDate,
      notes,
      subtotal,
      tax,
      total
    });

    // Add items
    await Invoice.addItems(invoice.id, items);

    // Get complete invoice with items
    const completeInvoice = await Invoice.findById(invoice.id);

    res.status(201).json({
      success: true,
      data: completeInvoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update invoice
 * @route   PUT /api/invoices/:id
 * @access  Private
 */
exports.updateInvoice = async (req, res, next) => {
  try {
    const { clientId, items, dueDate, notes } = req.body;

    // Check if invoice exists and user owns it
    const existingInvoice = await Invoice.findById(req.params.id);
    if (!existingInvoice) {
      throw new ApiError('Invoice not found', 404);
    }
    if (existingInvoice.user_id !== req.user.id) {
      throw new ApiError('Not authorized to update this invoice', 403);
    }

    // Calculate new totals if items are provided
    let totals = {};
    if (items) {
      totals = await Invoice.calculateTotals(items);
    }

    // Update invoice
    const invoice = await Invoice.update(req.params.id, {
      client_id: clientId,
      due_date: dueDate,
      notes,
      ...totals
    });

    // Update items if provided
    if (items) {
      await Invoice.updateItems(invoice.id, items);
    }

    // Get complete updated invoice
    const updatedInvoice = await Invoice.findById(invoice.id);

    res.status(200).json({
      success: true,
      data: updatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete invoice
 * @route   DELETE /api/invoices/:id
 * @access  Private
 */
exports.deleteInvoice = async (req, res, next) => {
  try {
    // Check if invoice exists and user owns it
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      throw new ApiError('Invoice not found', 404);
    }
    if (invoice.user_id !== req.user.id) {
      throw new ApiError('Not authorized to delete this invoice', 403);
    }

    await Invoice.delete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark invoice as paid
 * @route   PUT /api/invoices/:id/pay
 * @access  Private
 */
exports.markInvoiceAsPaid = async (req, res, next) => {
  try {
    // Check if invoice exists and user owns it
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      throw new ApiError('Invoice not found', 404);
    }
    if (invoice.user_id !== req.user.id) {
      throw new ApiError('Not authorized to update this invoice', 403);
    }

    const updatedInvoice = await Invoice.updateStatus(req.params.id, 'paid');

    // Send confirmation email
    try {
      await emailService.sendPaymentConfirmation(updatedInvoice);
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError);
    }

    res.status(200).json({
      success: true,
      data: updatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send invoice by email
 * @route   POST /api/invoices/:id/send
 * @access  Private
 */
exports.sendInvoiceEmail = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      throw new ApiError('Invoice not found', 404);
    }

    if (invoice.user_id !== req.user.id) {
      throw new ApiError('Not authorized to send this invoice', 403);
    }

    await emailService.sendInvoice(invoice);

    res.status(200).json({
      success: true,
      message: 'Invoice sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get invoice statistics
 * @route   GET /api/invoices/stats
 * @access  Private
 */
exports.getInvoiceStats = async (req, res, next) => {
  try {
    const invoices = await Invoice.findByUser(req.user.id);

    const stats = {
      total: invoices.length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      pending: invoices.filter(inv => inv.status === 'pending').length,
      totalAmount: invoices.reduce((acc, inv) => acc + inv.total, 0),
      paidAmount: invoices.filter(inv => inv.status === 'paid')
        .reduce((acc, inv) => acc + inv.total, 0),
      pendingAmount: invoices.filter(inv => inv.status === 'pending')
        .reduce((acc, inv) => acc + inv.total, 0)
    };

    // Calculate monthly stats for the last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    const monthlyStats = invoices
      .filter(inv => new Date(inv.created_at) >= sixMonthsAgo)
      .reduce((acc, inv) => {
        const date = new Date(inv.created_at);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!acc[monthYear]) {
          acc[monthYear] = {
            month: monthYear,
            count: 0,
            amount: 0,
            paid: 0,
            paidAmount: 0
          };
        }
        
        acc[monthYear].count++;
        acc[monthYear].amount += inv.total;
        
        if (inv.status === 'paid') {
          acc[monthYear].paid++;
          acc[monthYear].paidAmount += inv.total;
        }
        
        return acc;
      }, {});

    stats.monthly = Object.values(monthlyStats);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
