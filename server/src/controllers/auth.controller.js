const User = require('../models/user.model');
const { ApiError } = require('../middleware/errorHandler');
const supabase = require('../config/db');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { full_name, email, password, company_name, company_address, company_phone, company_email } = req.body;

    // Create user with profile
    const user = await User.create({
      email,
      password,
      full_name,
      company_name,
      company_address,
      company_phone,
      company_email
    });

    // Generate token
    const token = User.generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      throw new ApiError('Please provide an email and password', 400);
    }

    // Check for user and authenticate
    const user = await User.authenticate(email, password);
    
    // Get user profile
    const profile = await User.findById(user.id);

    // Generate token
    const token = User.generateToken(profile);

    res.status(200).json({
      success: true,
      token,
      user: profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, company_name, company_address, company_phone, company_email } = req.body;

    const updateData = {
      full_name,
      company_name,
      company_address,
      company_phone,
      company_email
    };

    const user = await User.update(req.user.id, updateData);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/auth/password
 * @access  Private
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError('Please provide both current and new password', 400);
    }

    // Re-authenticate user to verify current password
    await User.authenticate(req.user.email, currentPassword);

    // Update password in Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log user out
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};
