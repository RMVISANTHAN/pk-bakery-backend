const express = require('express');
const router = express.Router();
const { registerToken, broadcast } = require('../controllers/notificationController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/register-token', protect, registerToken);
router.post('/broadcast', protect, adminOnly, broadcast);

module.exports = router;
