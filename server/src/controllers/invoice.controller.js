const Invoice = require('../models/invoice.model');
const { ApiError } = require('../middleware/errorHandler');
const emailService = require('../services/email.service');
const { supabase } = require('../services/database.service');
const crypto = require('crypto');

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
 * @desc    Get invoice by invoice number and access token (public access for client viewing/payment)
 * @route   GET /api/invoices/public/:invoiceNumber/:accessToken
 * @access  Public
 */
exports.getInvoiceByNumber = async (req, res, next) => {
  try {
    const { invoiceNumber, accessToken } = req.params;

    if (!accessToken) {
      // This check might be redundant if the route enforces the accessToken param
      throw new ApiError('Access token is required', 400);
    }

    // Pass both invoiceNumber and accessToken to the model function
    const invoice = await Invoice.findByNumber(invoiceNumber, accessToken);

    if (!invoice) {
      // The model now throws specific errors for not found vs invalid token
      // Let the model's error propagate, or re-wrap if needed.
      // For consistency, we can let the global error handler catch it.
      // Alternatively, re-throw with ApiError:
      throw new ApiError('Invoice not found or access denied', 404); // Keep generic for security
    }

    // Remove sensitive data before sending to client if necessary
    // e.g., delete invoice.access_token;
    // delete invoice.token_expires_at;

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    // Catch specific errors from the model if needed
    if (error.message === 'Invalid or expired access token.') {
      return next(new ApiError(error.message, 401)); // Unauthorized
    } else if (error.message === 'Invoice not found.') {
      return next(new ApiError(error.message, 404)); // Not Found
    } else if (error.message === 'Access token is required to view this invoice.') {
       return next(new ApiError(error.message, 400)); // Bad Request
    }
    // Pass other errors to the global handler
    next(error);
  }
};

/**
 * @desc    Create new invoice
 * @route   POST /api/invoices
 * @access  Private (Admin)
 */
exports.createInvoice = async (req, res, next) => {
  try {
    // Use clientEmail and clientName from request body
    const { clientId, clientEmail, clientName, items, dueDate, notes } = req.body; 

    if (!clientEmail || !items || !dueDate) {
      throw new ApiError('Missing required fields: clientEmail, items, dueDate', 400);
    }

    // --- Client User Handling (Re-introduced) ---
    let clientAuthId = null;
    let temporaryPassword = null;
    let clientExists = false;

    // 1. Check if user exists by email
    const { data: existingUser, error: findError } = await supabase.auth.admin.getUserByEmail(clientEmail);

    if (findError && findError.status !== 404) {
      console.error('Supabase getUser Error:', findError);
      throw new ApiError('Error checking client account.', 500);
    }

    if (existingUser && existingUser.user) {
      clientAuthId = existingUser.user.id;
      clientExists = true;
      console.log(`Client user found: ${clientAuthId}`);
    } else {
      // 2. User doesn't exist, create one
      temporaryPassword = crypto.randomBytes(8).toString('hex'); 
      console.log(`Creating new client user: ${clientEmail}, Temp Pass: ${temporaryPassword}`);

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: clientEmail,
        password: temporaryPassword,
        email_confirm: true, 
        user_metadata: { full_name: clientName || clientEmail }
      });

      if (createError) {
        console.error('Supabase createUser Error:', createError);
        throw new ApiError(`Failed to create client account: ${createError.message}`, 500);
      }
      
      if (!newUser || !newUser.user) {
         throw new ApiError('Failed to create client user, received null user.', 500);
      }

      clientAuthId = newUser.user.id;
      console.log(`New client user created: ${clientAuthId}`);
      
      // Create corresponding entry in 'profiles' table
      const { error: profileError } = await supabase
        .from('profiles') 
        .insert({
           id: clientAuthId, 
           email: clientEmail, 
           full_name: clientName || clientEmail, 
           role: 'client' // Assign 'client' role
         });

      if (profileError) {
          console.error("Error creating client profile:", profileError);
          // Non-critical? Maybe just log it.
      }
    }
    // --- End Client User Handling ---

    // Calculate totals
    const { subtotal, tax, total } = await Invoice.calculateTotals(items);

    // Generate access token and set expiration (7 days from now)
    const accessToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // 7 days from now

    // Create invoice data object
    const invoiceData = {
      user_id: req.user.id,       // Admin User ID
      client_id: clientId,        // Original client ID from clients table (if still used)
      client_auth_id: clientAuthId, // Store the client's Supabase Auth ID
      client_email: clientEmail,   
      client_name: clientName,     
      due_date: dueDate,
      notes,
      subtotal,
      tax,
      total,
      status: 'pending',
      access_token: accessToken,
      token_expires_at: tokenExpiresAt.toISOString()
    };

    // Create the invoice
    const invoice = await Invoice.create(invoiceData);

    // Send email to client
    await emailService.sendInvoiceCreatedEmail(invoice, temporaryPassword, clientExists);

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

/**
 * @desc    Get all invoices for the currently logged-in client
 * @route   GET /api/client/invoices
 * @access  Private (Client role)
 */
exports.getClientInvoices = async (req, res, next) => {
  try {
    // The user ID from protect middleware is the client's auth ID
    const clientAuthId = req.user.id;
    
    // Optional query parameters (e.g., ?status=paid)
    const query = {};
    if (req.query.status) query.status = req.query.status;

    const invoices = await Invoice.findByClientAuthId(clientAuthId, query);

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};
