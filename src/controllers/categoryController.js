const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');

// @route   GET /api/categories
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort('sortOrder');
  res.json({ success: true, data: categories });
});

// @route   POST /api/categories (Admin)
const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, data: category });
});

// @route   PUT /api/categories/:id (Admin)
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }
  res.json({ success: true, data: category });
});

// @route   DELETE /api/categories/:id (Admin)
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }
  res.json({ success: true, message: 'Category deleted' });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
