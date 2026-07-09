// Run with: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

const categoryNames = [
  'Cakes', 'Birthday Cakes', 'Wedding Cakes', 'Breads', 'Buns',
  'Cookies', 'Pastries', 'Donuts', 'Sandwiches', 'Beverages',
];

const run = async () => {
  await connectDB();

  // Admin account
  const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (!adminExists) {
    await User.create({
      name: 'PK Bakery Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      isVerified: true,
    });
    console.log(`Admin created: ${process.env.ADMIN_EMAIL}`);
  }

  // Categories
  const categoryDocs = {};
  for (const [i, name] of categoryNames.entries()) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    let cat = await Category.findOne({ slug });
    if (!cat) {
      cat = await Category.create({ name, slug, sortOrder: i });
      console.log(`Category created: ${name}`);
    }
    categoryDocs[name] = cat;
  }

  // A couple of sample products so the app isn't empty on first run
  const sampleProducts = [
    {
      name: 'Classic Chocolate Truffle Cake',
      slug: 'classic-chocolate-truffle-cake',
      category: categoryDocs['Cakes']._id,
      images: ['https://via.placeholder.com/600x600.png?text=Chocolate+Truffle+Cake'],
      price: 649,
      discountPercent: 10,
      description: 'Rich chocolate sponge layered with dark chocolate truffle and ganache.',
      ingredients: ['Flour', 'Cocoa', 'Sugar', 'Eggs', 'Butter', 'Chocolate'],
      weightOptions: [
        { label: '500g', priceModifier: 0 },
        { label: '1kg', priceModifier: 450 },
      ],
      tags: ['bestseller'],
    },
    {
      name: 'Butter Croissant',
      slug: 'butter-croissant',
      category: categoryDocs['Pastries']._id,
      images: ['https://via.placeholder.com/600x600.png?text=Butter+Croissant'],
      price: 89,
      description: 'Flaky, buttery, freshly baked French croissant.',
      ingredients: ['Flour', 'Butter', 'Yeast', 'Milk', 'Sugar'],
      tags: ['new'],
    },
  ];

  for (const p of sampleProducts) {
    const exists = await Product.findOne({ slug: p.slug });
    if (!exists) {
      await Product.create(p);
      console.log(`Product created: ${p.name}`);
    }
  }

  console.log('Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
