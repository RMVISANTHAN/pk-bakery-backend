const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Product = require('../models/Product');

// @route   GET /api/reviews/product/:productId
const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId, isVisible: true })
    .populate('customer', 'name avatar')
    .sort('-createdAt');
  res.json({ success: true, data: reviews });
});

// @route   POST /api/reviews  { productId, orderId, rating, comment, images }
// @access  Private (only after delivery, ideally verified against order)
const createReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, comment, images } = req.body;

  const review = await Review.create({
    product: productId,
    customer: req.user._id,
    order: orderId,
    rating,
    comment,
    images,
  });

  // Recalculate product rating aggregate
  const stats = await Review.aggregate([
    { $match: { product: review.product, isVisible: true } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length) {
    await Product.findByIdAndUpdate(productId, {
      ratingAverage: +stats[0].avg.toFixed(1),
      ratingCount: stats[0].count,
    });
  }

  res.status(201).json({ success: true, data: review });
});

// @route   DELETE /api/reviews/:id (owner or admin)
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }
  if (review.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this review');
  }
  await review.deleteOne();
  res.json({ success: true, message: 'Review deleted' });
});

module.exports = { getProductReviews, createReview, deleteReview };
