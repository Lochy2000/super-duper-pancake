const mongoose = require('mongoose');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const config = require('../config/env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  try {
    // Generate a salt and hash the password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Create admin user with pre-hashed password to bypass middleware issues
    const admin = await User.findOneAndUpdate(
      { email: 'admin@example.com' },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    console.log(`Admin user created with email: ${admin.email}`);
    console.log(`Password: password123`);
    console.log(`Please change this password after first login!`);
    
    return admin;
  } catch (error) {
    console.error('Error seeding admin user:', error);
    throw error;
  }
};

const seedInvoices = async (adminId) => {
  try {
    // Sample clients
    const clients = [
      { name: 'John Smith', email: 'john@example.com' },
      { name: 'Alice Johnson', email: 'alice@example.com' },
      { name: 'Tech Solutions Inc.', email: 'billing@techsolutions.com' }
    ];
    
    // Create sample invoices
    const invoices = [];
    
    // Paid invoice
    invoices.push({
      invoiceNumber: 'INV-001',
      clientName: clients[0].name,
      clientEmail: clients[0].email,
      items: [
        { description: 'Web Design Services', quantity: 1, price: 1500 },
        { description: 'Hosting (Annual)', quantity: 1, price: 200 }
      ],
      subtotal: 1700,
      tax: 170,
      total: 1870,
      status: 'paid',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      creator: adminId,
      paymentMethod: 'stripe',
      transactionId: 'test_transaction_001'
    });
    
    // Unpaid invoice
    invoices.push({
      invoiceNumber: 'INV-002',
      clientName: clients[1].name,
      clientEmail: clients[1].email,
      items: [
        { description: 'Logo Design', quantity: 1, price: 500 },
        { description: 'Business Cards', quantity: 250, price: 0.8 }
      ],
      subtotal: 700,
      tax: 70,
      total: 770,
      status: 'unpaid',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      creator: adminId
    });
    
    // Overdue invoice
    invoices.push({
      invoiceNumber: 'INV-003',
      clientName: clients[2].name,
      clientEmail: clients[2].email,
      items: [
        { description: 'IT Consulting', quantity: 10, price: 150 },
        { description: 'Server Setup', quantity: 1, price: 800 }
      ],
      subtotal: 2300,
      tax: 230,
      total: 2530,
      status: 'overdue',
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      creator: adminId
    });
    
    // Clear existing invoices
    await Invoice.deleteMany({});
    
    // Insert new invoices
    await Invoice.insertMany(invoices);
    
    console.log(`${invoices.length} sample invoices created successfully`);
  } catch (error) {
    console.error('Error seeding invoices:', error);
    throw error;
  }
};

const runSeed = async () => {
  try {
    await connectDB();
    
    // Seed admin user
    const admin = await seedAdmin();
    
    // Seed invoices
    await seedInvoices(admin._id);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
};

// Run the seed function
runSeed();
