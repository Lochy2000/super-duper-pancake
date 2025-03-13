const Invoice = require('../models/Invoice');
const { ApiError } = require('../middleware/errorHandler');
const emailService = require('../services/email.service');

/**
 * @desc    Get all invoices
 * @route   GET /api/invoices
 * @access  Private
 */
exports.getInvoices = async (req, res, next) => {
  try {
    // If user is admin, get all invoices, otherwise get only the ones they created
    const query = req.user.role === 'admin' ? {} : { creator: req.user.id };
    
    const invoices = await Invoice.find(query).sort({ createdAt: -1 });
    
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
      throw new ApiError(`Invoice not found with id of ${req.params.id}`, 404);
    }
    
    // Check if user has permission to view this invoice
    if (req.user.role !== 'admin' && invoice.creator.toString() !== req.user.id) {
      throw new ApiError(`User not authorized to view this invoice`, 403);
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
    const invoice = await Invoice.findOne({
      invoiceNumber: req.params.invoiceNumber
    });
    
    if (!invoice) {
      throw new ApiError(`Invoice not found with number ${req.params.invoiceNumber}`, 404);
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
    // Add creator to req.body
    req.body.creator = req.user.id;
    
    // Validate items
    if (!req.body.items || req.body.items.length === 0) {
      throw new ApiError('Please add at least one item to the invoice', 400);
    }
    
    // Create invoice
    const invoice = await Invoice.create(req.body);
    
    // Send email notification if requested
    if (req.body.sendEmail) {
      await emailService.sendInvoiceCreatedEmail(invoice);
    }
    
    res.status(201).json({
      success: true,
      data: invoice
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
    let invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      throw new ApiError(`Invoice not found with id of ${req.params.id}`, 404);
    }
    
    // Check if user has permission to update this invoice
    if (req.user.role !== 'admin' && invoice.creator.toString() !== req.user.id) {
      throw new ApiError(`User not authorized to update this invoice`, 403);
    }
    
    // Prevent updating invoiceNumber
    if (req.body.invoiceNumber && req.body.invoiceNumber !== invoice.invoiceNumber) {
      throw new ApiError('Invoice number cannot be changed', 400);
    }
    
    // Update invoice
    invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: invoice
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
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      throw new ApiError(`Invoice not found with id of ${req.params.id}`, 404);
    }
    
    // Check if user has permission to delete this invoice
    if (req.user.role !== 'admin' && invoice.creator.toString() !== req.user.id) {
      throw new ApiError(`User not authorized to delete this invoice`, 403);
    }
    
    await invoice.deleteOne();
    
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
    let invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      throw new ApiError(`Invoice not found with id of ${req.params.id}`, 404);
    }
    
    // Update status to paid
    invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'paid' },
      { new: true, runValidators: true }
    );
    
    // Send payment confirmation email if applicable
    if (req.body.sendEmail) {
      await emailService.sendPaymentConfirmationEmail(invoice);
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
 * @desc    Send invoice by email
 * @route   POST /api/invoices/:id/send
 * @access  Private
 */
exports.sendInvoiceEmail = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      throw new ApiError(`Invoice not found with id of ${req.params.id}`, 404);
    }
    
    // Check if user has permission
    if (req.user.role !== 'admin' && invoice.creator.toString() !== req.user.id) {
      throw new ApiError(`User not authorized to send this invoice`, 403);
    }
    
    // Get email from request or use client email
    const email = req.body.email || invoice.clientEmail;
    
    if (!email) {
      throw new ApiError('Email address is required', 400);
    }
    
    // Send email
    await emailService.sendInvoiceCreatedEmail(invoice, email);
    
    res.status(200).json({
      success: true,
      message: `Invoice sent to ${email}`
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
    // Base query - if admin, get all stats, otherwise only user's invoices
    const baseQuery = req.user.role === 'admin' ? {} : { creator: req.user.id };
    
    // Count by status
    const totalCount = await Invoice.countDocuments(baseQuery);
    const paidCount = await Invoice.countDocuments({ ...baseQuery, status: 'paid' });
    const unpaidCount = await Invoice.countDocuments({ ...baseQuery, status: 'unpaid' });
    const overdueCount = await Invoice.countDocuments({ ...baseQuery, status: 'overdue' });
    
    // Sum total amounts
    const totalAmountAggregation = await Invoice.aggregate([
      { $match: baseQuery },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const totalAmount = totalAmountAggregation.length > 0 ? totalAmountAggregation[0].total : 0;
    
    // Sum paid amounts
    const paidAmountAggregation = await Invoice.aggregate([
      { $match: { ...baseQuery, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const paidAmount = paidAmountAggregation.length > 0 ? paidAmountAggregation[0].total : 0;
    
    // Sum unpaid amounts
    const unpaidAmountAggregation = await Invoice.aggregate([
      { $match: { ...baseQuery, status: { $ne: 'paid' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const unpaidAmount = unpaidAmountAggregation.length > 0 ? unpaidAmountAggregation[0].total : 0;
    
    res.status(200).json({
      success: true,
      data: {
        counts: {
          total: totalCount,
          paid: paidCount,
          unpaid: unpaidCount,
          overdue: overdueCount
        },
        amounts: {
          total: totalAmount,
          paid: paidAmount,
          unpaid: unpaidAmount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
