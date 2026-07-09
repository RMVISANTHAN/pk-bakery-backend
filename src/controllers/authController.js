const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

// @desc    Register a new customer (email or phone + password)
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !password || (!email && !phone)) {
    res.status(400);
    throw new Error('Name, password, and either email or phone are required');
  }

  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) {
    res.status(400);
    throw new Error('An account with this email or phone already exists');
  }

  const user = await User.create({ name, email, phone, password });

  res.status(201).json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
    token: generateToken(user._id),
  });
});

// @desc    Login with email/phone + password
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body; // identifier = email or phone

  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }],
  }).select('+password');

  if (!user || !user.password || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  user.lastLogin = new Date();
  await user.save();

  res.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
    token: generateToken(user._id),
  });
});

// @desc    Login/register via Google Sign-In
// @route   POST /api/auth/google
// @access  Public
// NOTE: `idToken` should be verified against Google's tokeninfo endpoint or
// via the `google-auth-library` package before trusting the decoded payload.
// This stub assumes the client sends verified profile fields for simplicity -
// replace with real verification before production use.
const googleAuth = asyncHandler(async (req, res) => {
  const { googleId, email, name, avatar } = req.body;

  if (!googleId || !email) {
    res.status(400);
    throw new Error('Google profile data is required');
  }

  let user = await User.findOne({ $or: [{ googleId }, { email }] });
  if (!user) {
    user = await User.create({ googleId, email, name, avatar, isVerified: true });
  } else if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
  }

  res.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email },
    token: generateToken(user._id),
  });
});

// @desc    Request a password reset (sends OTP/reset link via email or SMS provider)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });

  // Always return success to avoid leaking which accounts exist
  if (!user) {
    return res.json({ success: true, message: 'If an account exists, a reset code has been sent' });
  }

  const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-char OTP
  // TODO: hash + store resetToken and expiry on the user, then send via
  // an email provider (e.g. SendGrid) or SMS provider (e.g. Twilio/MSG91).
  console.log(`Password reset code for ${identifier}: ${resetToken}`);

  res.json({ success: true, message: 'If an account exists, a reset code has been sent' });
});

// @desc    Reset password using OTP/token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { identifier, code, newPassword } = req.body;
  // TODO: verify `code` against the stored hashed token + expiry
  const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
  if (!user) {
    res.status(400);
    throw new Error('Invalid request');
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
});

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { register, login, googleAuth, forgotPassword, resetPassword, getMe };
