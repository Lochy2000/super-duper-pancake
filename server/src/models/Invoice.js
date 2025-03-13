const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  quantity: {
    type: Number,
    required: [true, 'Please add a quantity'],
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative']
  }
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Please add an invoice number'],
    unique: true,
    trim: true
  },
  clientId: {
    type: String,
    trim: true
  },
  clientName: {
    type: String,
    required: [true, 'Please add a client name'],
    trim: true
  },
  clientEmail: {
    type: String,
    required: [true, 'Please add a client email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ],
    lowercase: true
  },
  items: {
    type: [InvoiceItemSchema],
    required: [true, 'Please add at least one item'],
    validate: [
      {
        validator: function(items) {
          return items.length > 0;
        },
        message: 'At least one item is required'
      }
    ]
  },
  subtotal: {
    type: Number,
    required: [true, 'Please add a subtotal'],
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    required: [true, 'Please add tax amount'],
    min: [0, 'Tax cannot be negative']
  },
  total: {
    type: Number,
    required: [true, 'Please add a total amount'],
    min: [0, 'Total cannot be negative']
  },
  status: {
    type: String,
    enum: ['unpaid', 'paid', 'overdue'],
    default: 'unpaid'
  },
  dueDate: {
    type: Date,
    required: [true, 'Please add a due date']
  },
  notes: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', ''],
    default: ''
  },
  transactionId: {
    type: String,
    trim: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create a compound index for efficient queries
InvoiceSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model('Invoice', InvoiceSchema);
