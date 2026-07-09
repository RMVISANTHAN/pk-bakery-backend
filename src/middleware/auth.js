const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');

// Verifies a customer/admin JWT and attaches `req.user`
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user || !req.user.isActive) {
      res.status(401);
      throw new Error('User not found or inactive');
    }
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});

// Restrict route to admin role only
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403);
  throw new Error('Admin access required');
};

// Verifies a delivery-partner JWT and attaches `req.partner`
const protectPartner = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.partner = await DeliveryPartner.findById(decoded.id);
    if (!req.partner || !req.partner.isActive) {
      res.status(401);
      throw new Error('Delivery partner not found or inactive');
    }
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});

module.exports = { protect, adminOnly, protectPartner };
