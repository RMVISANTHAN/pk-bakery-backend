const asyncHandler = require('express-async-handler');
const Coupon = require('../models/Coupon');

// @route   POST /api/coupons/validate  { code, cartTotal }
// @access  Private
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  const now = new Date();

  if (
    !coupon ||
    coupon.validFrom > now ||
    coupon.validUntil < now ||
    coupon.usedCount >= coupon.usageLimit ||
    cartTotal < coupon.minOrderValue
  ) {
    res.status(400);
    throw new Error('Coupon is invalid or not applicable to this order');
  }

  const discount =
    coupon.discountType === 'flat'
      ? coupon.discountValue
      : Math.min((cartTotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity);

  res.json({ success: true, data: { code: coupon.code, discount } });
});

// @route   GET /api/coupons (Admin)
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.json({ success: true, data: coupons });
});

// @route   POST /api/coupons (Admin)
const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, data: coupon });
});

// @route   PUT /api/coupons/:id (Admin)
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }
  res.json({ success: true, data: coupon });
});

// @route   DELETE /api/coupons/:id (Admin)
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }
  res.json({ success: true, message: 'Coupon deactivated' });
});

module.exports = { validateCoupon, getCoupons, createCoupon, updateCoupon, deleteCoupon };
