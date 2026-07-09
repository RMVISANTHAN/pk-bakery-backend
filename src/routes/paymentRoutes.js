const express = require('express');
const router = express.Router();
const { createRazorpayOrder, verifyRazorpayPayment, razorpayWebhook } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/razorpay/order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);
// Webhook must receive the raw body for signature verification - mounted with express.raw() in server.js
router.post('/razorpay/webhook', razorpayWebhook);

module.exports = router;
