/**
 * This script resets the admin user password
 * Run with: node src/scripts/reset-admin.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const User = require('../models/User');

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

const resetAdminPassword = async () => {
  try {
    await connectDB();
    
    // Create or update the admin user
    // We'll set the password directly with hash to bypass pre-save middleware issues
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Try to find the admin user
    let admin = await User.findOne({ email: 'admin@example.com' });
    
    if (admin) {
      // Update existing admin
      admin.password = hashedPassword;
      await admin.save({ validateBeforeSave: false }); // Skip validation
      console.log('Admin password reset successfully');
    } else {
      // Create new admin user with hashed password
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('New admin user created successfully');
    }
    
    console.log('Admin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: password123');
    console.log('Please change this password after logging in!');
    
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the reset function
resetAdminPassword();
