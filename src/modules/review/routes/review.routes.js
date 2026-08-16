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
 *           schema:
 *             type: object
 *             required:
 *               - overallRating
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               businessId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               branchId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               serviceId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               productId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               driverId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               overallRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               serviceRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               qualityRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               cleanlinessRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               deliveryRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               communicationRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 nullable: true
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 nullable: true
 *               images:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *           example:
 *             orderId: a7f11770-5f94-445d-bd33-307cdba8f600
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               overallRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               serviceRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               qualityRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               cleanlinessRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               deliveryRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               communicationRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 nullable: true
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 nullable: true
 *               images:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *           example:
 *             overallRating: 4
 *             qualityRating: 5
 *             title: Updated review
 *             description: Still great, but delivery was slightly late.
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
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
 *           example: a7f11770-5f94-445d-bd33-307cdba8f600
 *     responses:
 *       200:
 *         description: Like toggled
 */
router.post('/:id/like', likeReview);

module.exports = router;
