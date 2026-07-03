/**
 * Customer review routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  reportReview,
  likeReview,
} = require('../controllers/review.controller');
const {
  createReviewSchema,
  updateReviewSchema,
  reportReviewSchema,
  listReviewsSchema,
} = require('../validators/review.validator');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Reviews
 *     description: Customer ratings and reviews
 */

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: List reviews
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reviews list
 */
router.get('/', validate({ query: listReviewsSchema }), getReviews);

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a review for completed booking or order
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             orderId: 550e8400-e29b-41d4-a716-446655440000
 *             overallRating: 5
 *             qualityRating: 5
 *             deliveryRating: 4
 *             title: Great service
 *             description: Food was excellent and delivery was fast.
 *     responses:
 *       201:
 *         description: Review created
 */
router.post('/', validate({ body: createReviewSchema }), createReview);

/**
 * @swagger
 * /reviews/{id}:
 *   get:
 *     summary: Get review by ID
 *     tags: [Reviews]
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
 *         description: Review details
 */
router.get('/:id', getReviewById);

/**
 * @swagger
 * /reviews/{id}:
 *   patch:
 *     summary: Update own review
 *     tags: [Reviews]
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
 *         description: Review updated
 */
router.patch('/:id', validate({ body: updateReviewSchema }), updateReview);

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete own review
 *     tags: [Reviews]
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

/**
 * @swagger
 * /reviews/{id}/report:
 *   post:
 *     summary: Report a review
 *     tags: [Reviews]
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
 *       content:
 *         application/json:
 *           example:
 *             reason: Inappropriate content
 *     responses:
 *       200:
 *         description: Review reported
 */
router.post('/:id/report', validate({ body: reportReviewSchema }), reportReview);

/**
 * @swagger
 * /reviews/{id}/like:
 *   post:
 *     summary: Like or unlike a review
 *     tags: [Reviews]
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
 *         description: Like toggled
 */
router.post('/:id/like', likeReview);

module.exports = router;
