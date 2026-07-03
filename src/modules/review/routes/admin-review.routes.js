/**
 * Admin review routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  getAdminReviews,
  updateStatus,
  deleteReview,
  getDashboard,
} = require('../controllers/review.controller');
const { updateStatusSchema, listReviewsSchema } = require('../validators/review.validator');
const { ROLES } = require('../../../constants');

router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN));

/**
 * @swagger
 * tags:
 *   - name: Admin Reviews
 *     description: Admin review moderation
 */

/**
 * @swagger
 * /admin/reviews/dashboard:
 *   get:
 *     summary: Admin reviews dashboard
 *     tags: [Admin Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /admin/reviews:
 *   get:
 *     summary: List all reviews
 *     tags: [Admin Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reviews list
 */
router.get('/', validate({ query: listReviewsSchema }), getAdminReviews);

/**
 * @swagger
 * /admin/reviews/status:
 *   patch:
 *     summary: Update review status
 *     tags: [Admin Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             reviewId: 550e8400-e29b-41d4-a716-446655440000
 *             status: PUBLISHED
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/status', validate({ body: updateStatusSchema }), updateStatus);

/**
 * @swagger
 * /admin/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Admin Reviews]
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
 *         description: Review deleted
 */
router.delete('/:id', deleteReview);

module.exports = router;
