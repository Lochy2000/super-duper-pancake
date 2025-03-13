const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'Please add an invoice ID']
  },
  method: {
    type: String,
    enum: ['stripe', 'paypal'],
    required: [true, 'Please specify payment method']
  },
  transactionId: {
    type: String,
    required: [true, 'Please add a transaction ID'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount'],
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Create indexes for efficient queries
PaymentSchema.index({ invoiceId: 1 });
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
