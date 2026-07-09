const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    images: [{ type: String, required: true }],
    price: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    description: String,
    ingredients: [String],
    weightOptions: [
      {
        label: String, // e.g. "500g", "1kg"
        priceModifier: { type: Number, default: 0 },
      },
    ],
    isEggless: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    stock: { type: Number, default: 100 },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    tags: [String], // e.g. "bestseller", "new", "eggless"
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.virtual('finalPrice').get(function () {
  return +(this.price * (1 - this.discountPercent / 100)).toFixed(2);
});
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
