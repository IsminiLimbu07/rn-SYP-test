// backend/controllers/authController.js
const bcrypt = require('bcrypt');
const { query } = require('../db');
const generateToken = require('../utils/generateToken');

// Register new user
const register = async (req, res) => {
  try {
    const { full_name, email, phone_number, password } = req.body;

    // Validation
    if (!full_name || !email || !phone_number || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE email = $1 OR phone_number = $2',
      [email, phone_number]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone number already exists'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await query(
      `INSERT INTO users (full_name, email, phone_number, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING user_id, full_name, email, phone_number, is_verified, is_active, created_at`,
      [full_name, email, phone_number, password_hash]
    );

    const user = result[0];

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        is_verified: user.is_verified,
        is_active: user.is_active,
        created_at: user.created_at
      },
      token: generateToken(user.user_id)
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        is_verified: user.is_verified,
        is_active: user.is_active,
        is_admin: user.is_admin,
        created_at: user.created_at
      },
      token: generateToken(user.user_id)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await query(
      `SELECT user_id, full_name, email, phone_number, profile_picture_url, 
              is_verified, is_active, is_admin, created_at, updated_at 
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { full_name, phone_number, profile_picture_url } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (full_name) {
      updates.push(`full_name = $${paramCount}`);
      values.push(full_name);
      paramCount++;
    }

    if (phone_number) {
      // Validate phone
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(phone_number)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }

      // Check if phone is taken by another user
      const existingPhone = await query(
        'SELECT user_id FROM users WHERE phone_number = $1 AND user_id != $2',
        [phone_number, userId]
      );

      if (existingPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use'
        });
      }

      updates.push(`phone_number = $${paramCount}`);
      values.push(phone_number);
      paramCount++;
    }

    if (profile_picture_url !== undefined) {
      updates.push(`profile_picture_url = $${paramCount}`);
      values.push(profile_picture_url);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Add updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE user_id = $${paramCount}
      RETURNING user_id, full_name, email, phone_number, profile_picture_url, 
                is_verified, is_active, updated_at
    `;

    const result = await query(updateQuery, values);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: result[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { old_password, new_password } = req.body;

    // Validation
    if (!old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(
      old_password,
      result[0].password_hash
    );

    if (!isOldPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Old password is incorrect'
      });
    }

    // Hash new password
    const new_password_hash = await bcrypt.hash(new_password, 10);

    // Update password
    await query(
      `UPDATE users 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $2`,
      [new_password_hash, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};