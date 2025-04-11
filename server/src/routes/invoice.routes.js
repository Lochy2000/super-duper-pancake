const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getInvoice,
  getInvoiceByNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsPaid,
  sendInvoiceEmail,
  getInvoiceStats
} = require('../controllers/invoice.controller');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/public/:invoiceNumber/:accessToken', getInvoiceByNumber);

// Protected routes - require login
router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.get('/stats', getInvoiceStats);

router.route('/:id')
  .get(getInvoice)
  .put(updateInvoice)
  .delete(deleteInvoice);

router.put('/:id/pay', markInvoiceAsPaid);
router.post('/:id/send', sendInvoiceEmail);

module.exports = router;
