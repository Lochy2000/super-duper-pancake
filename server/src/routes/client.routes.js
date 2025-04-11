const express = require('express');
const router = express.Router();
const { getClientInvoices } = require('../controllers/invoice.controller');
const { protect, authorize } = require('../middleware/auth');

// All client routes require the user to be logged in
router.use(protect);

// Route to get invoices for the logged-in client
// Optionally, add authorize('client') if you want to strictly prevent admins from using this endpoint
router.get('/invoices', getClientInvoices); 

// Add other client-specific routes here in the future (e.g., update profile)

module.exports = router; 