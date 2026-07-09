const express = require('express');
const router = express.Router();
const {
  registerPartner,
  loginPartner,
  getAvailableOrders,
  acceptOrder,
  rejectOrder,
  markDelivered,
  updateLocation,
  toggleOnlineStatus,
  getEarnings,
} = require('../controllers/deliveryController');
const { protectPartner } = require('../middleware/auth');

router.post('/register', registerPartner);
router.post('/login', loginPartner);
router.get('/orders', protectPartner, getAvailableOrders);
router.put('/orders/:id/accept', protectPartner, acceptOrder);
router.put('/orders/:id/reject', protectPartner, rejectOrder);
router.put('/orders/:id/deliver', protectPartner, markDelivered);
router.put('/location', protectPartner, updateLocation);
router.put('/status', protectPartner, toggleOnlineStatus);
router.get('/earnings', protectPartner, getEarnings);

module.exports = router;
