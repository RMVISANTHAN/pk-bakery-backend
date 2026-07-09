const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Order = require('../models/Order');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create a Razorpay order for an existing PK Bakery order
// @route   POST /api/payments/razorpay/order  { orderId }
// @access  Private
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const rpOrder = await razorpay.orders.create({
    amount: Math.round(order.pricing.total * 100), // paise
    currency: 'INR',
    receipt: order.orderNumber,
  });

  const payment = await Payment.create({
    order: order._id,
    customer: order.customer,
    method: order.paymentMethod,
    amount: order.pricing.total,
    razorpayOrderId: rpOrder.id,
    status: 'created',
  });

  order.payment = payment._id;
  await order.save();

  res.json({
    success: true,
    razorpayOrderId: rpOrder.id,
    amount: rpOrder.amount,
    currency: rpOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

// @desc    Verify Razorpay payment signature after checkout completes on the client
// @route   POST /api/payments/razorpay/verify  { razorpayOrderId, razorpayPaymentId, razorpaySignature }
// @access  Private
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) {
    res.status(404);
    throw new Error('Payment record not found');
  }

  if (expectedSignature !== razorpaySignature) {
    payment.status = 'failed';
    payment.failureReason = 'Signature mismatch';
    await payment.save();
    res.status(400);
    throw new Error('Payment verification failed');
  }

  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.status = 'success';
  await payment.save();

  await Order.findByIdAndUpdate(payment.order, { paymentStatus: 'paid' });

  res.json({ success: true, message: 'Payment verified' });
});

// @desc    Razorpay webhook (server-to-server, for payment.captured / payment.failed events)
// @route   POST /api/payments/razorpay/webhook
// @access  Public (verified via webhook signature header)
const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expected) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  // TODO: handle req.body.event (payment.captured, payment.failed, refund.processed, etc.)
  res.json({ success: true });
});

module.exports = { createRazorpayOrder, verifyRazorpayPayment, razorpayWebhook };
