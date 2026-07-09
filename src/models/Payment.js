const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    method: { type: String, enum: ['cod', 'razorpay', 'upi', 'card'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: { type: String, enum: ['created', 'pending', 'success', 'failed', 'refunded'], default: 'pending' },
    failureReason: String,
    refundId: String,
    refundedAmount: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
