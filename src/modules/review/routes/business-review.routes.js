/**
 * Business review routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getBusinessReviews,
  replyToReview,
  getDashboard,
} = require('../controllers/review.controller');
const { replyReviewSchema, listReviewsSchema } = require('../validators/review.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);
router.use(
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.SUPPORT_ADMIN,
    ROLES.BUSINESS_OWNER,
    ROLES.BUSINESS_MANAGER,
  ),
);

/**
 * @swagger
 * tags:
 *   - name: Business Reviews
 *     description: Business review management
 */

/**
 * @swagger
 * /business/reviews/dashboard:
 *   get:
 *     summary: Reviews dashboard
 *     tags: [Business Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /business/reviews:
 *   get:
 *     summary: List business reviews
 *     tags: [Business Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reviews list
 */
router.get('/', validate({ query: listReviewsSchema }), getBusinessReviews);

/**
 * @swagger
 * /business/reviews/{id}/reply:
 *   post:
 *     summary: Reply to a review
 *     tags: [Business Reviews]
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
 *             message: Thank you for your feedback!
 *     responses:
 *       200:
 *         description: Reply posted
 */
router.post('/:id/reply', validate({ body: replyReviewSchema }), replyToReview);

module.exports = router;
