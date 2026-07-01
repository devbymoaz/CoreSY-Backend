const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const {
  createCashier,
  getCashiers,
  getCashierById,
  getBusinessCashiers,
  getBranchCashiers,
  updateCashier,
  deleteCashier,
  updateCashierStatus,
  resetCashierPassword,
  getCashierProfile,
  updateCashierProfile,
  changeCashierPassword,
  getDashboardStats,
  uploadProfileImage,
} = require('../controllers/cashier.controller');
const {
  createCashierSchema,
  updateCashierSchema,
  updateCashierStatusSchema,
  resetCashierPasswordSchema,
  changeCashierPasswordSchema,
  listCashiersSchema,
  updateCashierProfileSchema,
} = require('../validators/cashier.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);

// Profile routes (only for Cashier)
router.get('/profile', getCashierProfile);
router.patch('/profile', validate({ body: updateCashierProfileSchema }), updateCashierProfile);
router.patch('/change-password', validate({ body: changeCashierPasswordSchema }), changeCashierPassword);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Business & Branch cashiers
router.get('/business/:businessId', getBusinessCashiers);
router.get('/branch/:branchId', getBranchCashiers);

// Main CRUD
router.get('/', validate({ query: listCashiersSchema }), getCashiers);
router.get('/:id', getCashierById);
router.post('/', validate({ body: createCashierSchema }), createCashier);
router.patch('/:id', validate({ body: updateCashierSchema }), updateCashier);
router.delete('/:id', deleteCashier);
router.patch('/:id/status', validate({ body: updateCashierStatusSchema }), updateCashierStatus);
router.patch('/:id/reset-password', validate({ body: resetCashierPasswordSchema }), resetCashierPassword);
router.post('/profile-image', uploadProfileImage);

module.exports = router;
