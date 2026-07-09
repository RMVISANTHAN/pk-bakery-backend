const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const DeliveryPartner = require('../models/DeliveryPartner');

// @desc    Dashboard summary stats
// @route   GET /api/admin/dashboard?from=&to=
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  const match = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  const [totalOrders, totalCustomers, totalProducts, activePartners, revenueAgg, statusBreakdown] = await Promise.all([
    Order.countDocuments(match),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments({ isActive: true }),
    DeliveryPartner.countDocuments({ isOnline: true }),
    Order.aggregate([
      { $match: { ...match, paymentStatus: 'paid' } },
      { $group: { _id: null, revenue: { $sum: '$pricing.total' } } },
    ]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  res.json({
    success: true,
    data: {
      totalOrders,
      totalCustomers,
      totalProducts,
      activePartners,
      totalRevenue: revenueAgg[0]?.revenue || 0,
      ordersByStatus: statusBreakdown.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
    },
  });
});

// @desc    Sales report grouped by day
// @route   GET /api/admin/reports/sales?from=&to=
// @access  Private/Admin
const getSalesReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = { paymentStatus: 'paid' };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const report = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$pricing.total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data: report });
});

// @desc    List/manage customers
// @route   GET /api/admin/customers?search=&page=
// @access  Private/Admin
const getCustomers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = { role: 'customer' };
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }];

  const skip = (page - 1) * limit;
  const [customers, total] = await Promise.all([
    User.find(filter).select('-password').sort('-createdAt').skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, data: customers, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
});

// @desc    Toggle customer active status
// @route   PUT /api/admin/customers/:id/status  { isActive }
// @access  Private/Admin
const updateCustomerStatus = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
  if (!user) {
    res.status(404);
    throw new Error('Customer not found');
  }
  res.json({ success: true, data: user });
});

module.exports = { getDashboardStats, getSalesReport, getCustomers, updateCustomerStatus };
