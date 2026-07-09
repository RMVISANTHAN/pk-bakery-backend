const asyncHandler = require('express-async-handler');
const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const { generateToken } = require('../utils/generateToken');

// @route   POST /api/delivery/register
const registerPartner = asyncHandler(async (req, res) => {
  const { name, phone, email, password, vehicleType, vehicleNumber } = req.body;
  const existing = await DeliveryPartner.findOne({ phone });
  if (existing) {
    res.status(400);
    throw new Error('A delivery partner with this phone already exists');
  }
  const partner = await DeliveryPartner.create({ name, phone, email, password, vehicleType, vehicleNumber });
  res.status(201).json({
    success: true,
    partner: { id: partner._id, name: partner.name, phone: partner.phone, isVerified: partner.isVerified },
    token: generateToken(partner._id),
  });
});

// @route   POST /api/delivery/login  { phone, password }
const loginPartner = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const partner = await DeliveryPartner.findOne({ phone }).select('+password');
  if (!partner || !(await partner.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid credentials');
  }
  res.json({
    success: true,
    partner: { id: partner._id, name: partner.name, phone: partner.phone, isVerified: partner.isVerified },
    token: generateToken(partner._id),
  });
});

// @desc    Orders available for pickup (unassigned, confirmed/preparing) or assigned to this partner
// @route   GET /api/delivery/orders
// @access  Private/DeliveryPartner
const getAvailableOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    $or: [
      { deliveryPartner: req.partner._id, status: { $in: ['out_for_delivery'] } },
      { deliveryPartner: null, status: { $in: ['baking'] } },
    ],
  })
    .populate('customer', 'name phone')
    .sort('-createdAt');
  res.json({ success: true, data: orders });
});

// @desc    Accept an order for delivery
// @route   PUT /api/delivery/orders/:id/accept
// @access  Private/DeliveryPartner
const acceptOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || order.deliveryPartner) {
    res.status(400);
    throw new Error('Order not available for pickup');
  }
  order.deliveryPartner = req.partner._id;
  order.status = 'out_for_delivery';
  order.statusHistory.push({ status: 'out_for_delivery', note: `Accepted by ${req.partner.name}` });
  await order.save();
  res.json({ success: true, data: order });
});

// @desc    Reject an order (skip - stays in pool for others)
// @route   PUT /api/delivery/orders/:id/reject
// @access  Private/DeliveryPartner
const rejectOrder = asyncHandler(async (req, res) => {
  // No DB change needed since the order was never assigned; this endpoint exists
  // primarily so the client can log the rejection / trigger re-matching logic.
  res.json({ success: true, message: 'Order skipped' });
});

// @desc    Mark an order delivered
// @route   PUT /api/delivery/orders/:id/deliver
// @access  Private/DeliveryPartner
const markDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.partner._id });
  if (!order) {
    res.status(404);
    throw new Error('Order not found or not assigned to you');
  }
  order.status = 'delivered';
  order.deliveredAt = new Date();
  order.statusHistory.push({ status: 'delivered' });
  await order.save();

  // Credit earnings - flat delivery fee example, adjust to actual payout model
  const DELIVERY_FEE = 30;
  await DeliveryPartner.findByIdAndUpdate(req.partner._id, {
    $inc: { 'earnings.total': DELIVERY_FEE, 'earnings.pending': DELIVERY_FEE },
  });

  res.json({ success: true, data: order });
});

// @desc    Update live location (polled/streamed periodically by the app)
// @route   PUT /api/delivery/location  { lat, lng }
// @access  Private/DeliveryPartner
const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  await DeliveryPartner.findByIdAndUpdate(req.partner._id, {
    currentLocation: { lat, lng, updatedAt: new Date() },
  });
  // TODO: emit via socket.io to the customer's order-tracking screen
  res.json({ success: true });
});

// @desc    Toggle online/offline status
// @route   PUT /api/delivery/status  { isOnline }
// @access  Private/DeliveryPartner
const toggleOnlineStatus = asyncHandler(async (req, res) => {
  const partner = await DeliveryPartner.findByIdAndUpdate(
    req.partner._id,
    { isOnline: req.body.isOnline },
    { new: true }
  );
  res.json({ success: true, data: { isOnline: partner.isOnline } });
});

// @desc    Earnings summary + delivery history
// @route   GET /api/delivery/earnings
// @access  Private/DeliveryPartner
const getEarnings = asyncHandler(async (req, res) => {
  const history = await Order.find({ deliveryPartner: req.partner._id, status: 'delivered' })
    .select('orderNumber pricing.total deliveredAt')
    .sort('-deliveredAt');
  res.json({ success: true, data: { earnings: req.partner.earnings, history } });
});

module.exports = {
  registerPartner,
  loginPartner,
  getAvailableOrders,
  acceptOrder,
  rejectOrder,
  markDelivered,
  updateLocation,
  toggleOnlineStatus,
  getEarnings,
};
