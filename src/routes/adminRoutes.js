const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getSalesReport,
  getCustomers,
  updateCustomerStatus,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.get('/dashboard', getDashboardStats);
router.get('/reports/sales', getSalesReport);
router.get('/customers', getCustomers);
router.put('/customers/:id/status', updateCustomerStatus);

module.exports = router;
