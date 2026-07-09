const jwt = require('jsonwebtoken');

const generateToken = (id, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PKB${timestamp}${random}`;
};

module.exports = { generateToken, generateOrderNumber };
