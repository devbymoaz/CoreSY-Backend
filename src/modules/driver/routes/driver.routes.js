/**
 * Driver management routes.
 * Public registration/login plus driver and admin protected endpoints.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const driverAuthenticate = require('../middlewares/driver-auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  register,
  login,
  getProfile,
  updateProfile,
  uploadDocuments,
  uploadVehicle,
  updateAvailability,
  updateLocation,
  getDriverDashboard,
  getHistory,
  getDrivers,
  getDriverById,
  updateStatus,
  deleteDriver,
  getAdminDashboard,
} = require('../controllers/driver.controller');
const {
  registerDriverSchema,
  loginDriverSchema,
  updateProfileSchema,
  uploadDocumentsSchema,
  uploadVehicleSchema,
  updateStatusSchema,
  updateAvailabilitySchema,
  updateLocationSchema,
  listDriversSchema,
} = require('../validators/driver.validator');
const { ROLES } = require('../../../constants');

const adminRoles = [ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN];
const viewRoles = [
  ROLES.SUPER_ADMIN,
  ROLES.SUPPORT_ADMIN,
  ROLES.FINANCE_ADMIN,
  ROLES.BUSINESS_OWNER,
];

/**
 * @swagger
 * tags:
 *   - name: Drivers
 *     description: CoreSY Go driver management
 */

/**
 * @swagger
 * /drivers/register:
 *   post:
 *     summary: Register a new driver
 *     tags: [Drivers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             fullName: Omar Driver
 *             email: omar.driver@example.com
 *             phoneNumber: "+963911111111"
 *             password: SecurePass1!
 *             confirmPassword: SecurePass1!
 *             dateOfBirth: "1995-05-20"
 *             gender: MALE
 *             nationalId: "01020304050"
 *             drivingLicense: "DL-998877"
 *             vehicleType: MOTORCYCLE
 *             vehicleBrand: Honda
 *             vehicleModel: CG125
 *             vehicleRegistrationNumber: REG-123456
 *             vehiclePlateNumber: "12345-Damascus"
 *             governorateId: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       201:
 *         description: Driver registered and pending verification
 *       409:
 *         description: Duplicate email, phone, license, or vehicle number
 */
router.post('/register', validate({ body: registerDriverSchema }), register);

/**
 * @swagger
 * /drivers/login:
 *   post:
 *     summary: Driver login
 *     tags: [Drivers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             identifier: omar.driver@example.com
 *             password: SecurePass1!
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not active
 */
router.post('/login', validate({ body: loginDriverSchema }), login);

/**
 * @swagger
 * /drivers/profile:
 *   get:
 *     summary: Get authenticated driver profile
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver profile
 */
router.get('/profile', driverAuthenticate, getProfile);

/**
 * @swagger
 * /drivers/profile:
 *   patch:
 *     summary: Update authenticated driver profile
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             fullName: Omar Updated
 *             vehicleBrand: Yamaha
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch(
  '/profile',
  driverAuthenticate,
  validate({ body: updateProfileSchema }),
  updateProfile,
);

/**
 * @swagger
 * /drivers/upload-documents:
 *   post:
 *     summary: Upload driver documents
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nationalIdDocument: https://cdn.coresy.io/docs/nid.pdf
 *             drivingLicenseDocument: https://cdn.coresy.io/docs/license.pdf
 *             insuranceDocument: https://cdn.coresy.io/docs/insurance.pdf
 *     responses:
 *       200:
 *         description: Documents uploaded
 */
router.post(
  '/upload-documents',
  driverAuthenticate,
  validate({ body: uploadDocumentsSchema }),
  uploadDocuments,
);

/**
 * @swagger
 * /drivers/upload-vehicle:
 *   post:
 *     summary: Upload vehicle images and details
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             vehicleImages:
 *               - https://cdn.coresy.io/vehicles/bike-1.jpg
 *             vehicleBrand: Honda
 *             vehicleModel: CG125
 *     responses:
 *       200:
 *         description: Vehicle images uploaded
 */
router.post(
  '/upload-vehicle',
  driverAuthenticate,
  validate({ body: uploadVehicleSchema }),
  uploadVehicle,
);

/**
 * @swagger
 * /drivers/availability:
 *   patch:
 *     summary: Update driver availability status
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             availabilityStatus: ONLINE
 *     responses:
 *       200:
 *         description: Availability updated
 */
router.patch(
  '/availability',
  driverAuthenticate,
  validate({ body: updateAvailabilitySchema }),
  updateAvailability,
);

/**
 * @swagger
 * /drivers/location:
 *   patch:
 *     summary: Update driver current location
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             latitude: 33.5138
 *             longitude: 36.2765
 *     responses:
 *       200:
 *         description: Location updated
 */
router.patch(
  '/location',
  driverAuthenticate,
  validate({ body: updateLocationSchema }),
  updateLocation,
);

/**
 * @swagger
 * /drivers/dashboard:
 *   get:
 *     summary: Driver personal dashboard
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver dashboard stats
 */
router.get('/dashboard', driverAuthenticate, getDriverDashboard);

/**
 * @swagger
 * /drivers/history:
 *   get:
 *     summary: Driver delivery history summary
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Delivery history summary
 */
router.get('/history', driverAuthenticate, getHistory);

/**
 * @swagger
 * /drivers/admin/dashboard:
 *   get:
 *     summary: Admin drivers dashboard
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform driver stats
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 stats:
 *                   totalDrivers: 50
 *                   activeDrivers: 40
 *                   onlineDrivers: 12
 *                   busyDrivers: 5
 *                   completedDeliveries: 1200
 *                   cancelledDeliveries: 30
 */
router.get('/admin/dashboard', authenticate, authorizeRoles(...viewRoles), getAdminDashboard);

/**
 * @swagger
 * /drivers:
 *   get:
 *     summary: List drivers with search and filters
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_VERIFICATION, ACTIVE, INACTIVE, SUSPENDED, REJECTED]
 *       - in: query
 *         name: availabilityStatus
 *         schema:
 *           type: string
 *           enum: [ONLINE, OFFLINE, BUSY, ON_DELIVERY]
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [MOTORCYCLE, CAR, BICYCLE, VAN]
 *       - in: query
 *         name: governorateId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Drivers list
 */
router.get(
  '/',
  authenticate,
  authorizeRoles(...viewRoles),
  validate({ query: listDriversSchema }),
  getDrivers,
);

/**
 * @swagger
 * /drivers/{id}:
 *   get:
 *     summary: Get driver by ID
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Driver details
 */
router.get('/:id', authenticate, authorizeRoles(...viewRoles), getDriverById);

/**
 * @swagger
 * /drivers/{id}/status:
 *   patch:
 *     summary: Update driver status (approve, reject, suspend, activate)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             status: ACTIVE
 *             reason: Documents verified
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles(...adminRoles),
  validate({ body: updateStatusSchema }),
  updateStatus,
);

/**
 * @swagger
 * /drivers/{id}:
 *   delete:
 *     summary: Soft delete a driver
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Driver deleted
 */
router.delete('/:id', authenticate, authorizeRoles(ROLES.SUPER_ADMIN), deleteDriver);

module.exports = router;
