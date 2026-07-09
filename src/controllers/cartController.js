const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Product = require('../models/Product');

// @route   GET /api/cart
const getCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('cart.product');
  res.json({ success: true, data: user.cart });
});

// @route   POST /api/cart  { productId, weightOption, quantity }
const addToCart = asyncHandler(async (req, res) => {
  const { productId, weightOption, quantity = 1 } = req.body;
  const product = await Product.findById(productId);
  if (!product || !product.isAvailable) {
    res.status(400);
    throw new Error('Product not available');
  }

  const user = await User.findById(req.user._id);
  const existing = user.cart.find(
    (item) => item.product.toString() === productId && item.weightOption === weightOption
  );
  if (existing) {
    existing.quantity += quantity;
  } else {
    user.cart.push({ product: productId, weightOption, quantity });
  }
  await user.save();
  await user.populate('cart.product');
  res.json({ success: true, data: user.cart });
});

// @route   PUT /api/cart/:productId  { quantity, weightOption }
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity, weightOption } = req.body;
  const user = await User.findById(req.user._id);
  const item = user.cart.find(
    (i) => i.product.toString() === req.params.productId && i.weightOption === weightOption
  );
  if (!item) {
    res.status(404);
    throw new Error('Cart item not found');
  }
  item.quantity = quantity;
  await user.save();
  await user.populate('cart.product');
  res.json({ success: true, data: user.cart });
});

// @route   DELETE /api/cart/:productId
const removeCartItem = asyncHandler(async (req, res) => {
  const { weightOption } = req.query;
  const user = await User.findById(req.user._id);
  user.cart = user.cart.filter(
    (i) => !(i.product.toString() === req.params.productId && i.weightOption === weightOption)
  );
  await user.save();
  res.json({ success: true, data: user.cart });
});

// @route   DELETE /api/cart
const clearCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.cart = [];
  await user.save();
  res.json({ success: true, data: [] });
});

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
