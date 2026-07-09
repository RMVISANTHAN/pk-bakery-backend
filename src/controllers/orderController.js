const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { generateOrderNumber } = require('../utils/generateToken');

const GST_RATE = 0.05; // 5% - adjust to actual applicable rate
const BASE_DELIVERY_CHARGE = 40;
const FREE_DELIVERY_THRESHOLD = 499;

// @desc    Place an order from the user's cart
// @route   POST /api/orders  { addressId, deliveryInstructions, paymentMethod, couponCode }
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { addressId, deliveryInstructions, paymentMethod, couponCode } = req.body;

  const user = await User.findById(req.user._id).populate('cart.product');
  if (!user.cart.length) {
    res.status(400);
    throw new Error('Cart is empty');
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    res.status(400);
    throw new Error('Delivery address not found');
  }

  // Build order items + subtotal from live product data (never trust client prices)
  let subtotal = 0;
  const items = user.cart.map((item) => {
    const p = item.product;
    const weightMod = p.weightOptions?.find((w) => w.label === item.weightOption)?.priceModifier || 0;
    const unitPrice = +(p.price * (1 - p.discountPercent / 100) + weightMod).toFixed(2);
    subtotal += unitPrice * item.quantity;
    return {
      product: p._id,
      name: p.name,
      image: p.images?.[0],
      weightOption: item.weightOption,
      price: unitPrice,
      quantity: item.quantity,
    };
  });

  // Coupon validation
  let discount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    const now = new Date();
    if (
      coupon &&
      coupon.validFrom <= now &&
      coupon.validUntil >= now &&
      coupon.usedCount < coupon.usageLimit &&
      subtotal >= coupon.minOrderValue
    ) {
      discount =
        coupon.discountType === 'flat'
          ? coupon.discountValue
          : Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity);
      appliedCoupon = coupon;
    } else {
      res.status(400);
      throw new Error('Coupon is invalid or not applicable');
    }
  }

  const deliveryCharge = subtotal - discount >= FREE_DELIVERY_THRESHOLD ? 0 : BASE_DELIVERY_CHARGE;
  const gst = +((subtotal - discount) * GST_RATE).toFixed(2);
  const total = +(subtotal - discount + deliveryCharge + gst).toFixed(2);

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    customer: user._id,
    items,
    deliveryAddress: {
      label: address.label,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      lat: address.lat,
      lng: address.lng,
    },
    deliveryInstructions,
    coupon: appliedCoupon ? { code: appliedCoupon.code, discountAmount: discount } : undefined,
    pricing: { subtotal, deliveryCharge, gst, discount, total },
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    status: 'placed',
    statusHistory: [{ status: 'placed' }],
  });

  if (appliedCoupon) {
    appliedCoupon.usedCount += 1;
    await appliedCoupon.save();
  }

  // Clear cart after order is placed
  user.cart = [];
  await user.save();

  // TODO: emit socket.io event / FCM push "Order placed" here

  res.status(201).json({ success: true, data: order });
});

// @desc    Get logged-in customer's orders
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id }).sort('-createdAt');
  res.json({ success: true, data: orders });
});

// @desc    Get single order (for tracking screen)
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('deliveryPartner', 'name phone currentLocation vehicleType');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  res.json({ success: true, data: order });
});

// @desc    Update order status (admin or delivery partner)
// @route   PUT /api/orders/:id/status  { status, note }
// @access  Private/Admin or Private/DeliveryPartner
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  order.status = status;
  order.statusHistory.push({ status, note });
  if (status === 'delivered') order.deliveredAt = new Date();
  await order.save();

  // TODO: emit socket.io event / FCM push for real-time tracking updates

  res.json({ success: true, data: order });
});

// @desc    Cancel an order (customer, only if not yet out for delivery)
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (['out_for_delivery', 'delivered'].includes(order.status)) {
    res.status(400);
    throw new Error('Order can no longer be cancelled');
  }
  order.status = 'cancelled';
  order.cancelReason = req.body.reason;
  order.statusHistory.push({ status: 'cancelled', note: req.body.reason });
  await order.save();
  res.json({ success: true, data: order });
});

// @desc    All orders (admin)
// @route   GET /api/orders?status=&page=&limit=
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('customer', 'name phone').sort('-createdAt').skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, data: orders, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
});

module.exports = { createOrder, getMyOrders, getOrderById, updateOrderStatus, cancelOrder, getAllOrders };
