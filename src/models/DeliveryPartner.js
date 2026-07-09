const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, lowercase: true },
    password: { type: String, required: true, select: false, minlength: 6 },
    vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'car'], default: 'bike' },
    vehicleNumber: String,
    profilePhoto: String,
    documents: {
      license: String,
      idProof: String,
    },
    isVerified: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    currentLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
    fcmTokens: [String],
    earnings: {
      total: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
    },
    rating: { type: Number, default: 5 },
  },
  { timestamps: true }
);

deliveryPartnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

deliveryPartnerSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
