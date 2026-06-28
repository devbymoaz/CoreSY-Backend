/**
 * Health check routes.
 * Exposes endpoints for application and infrastructure health monitoring.
 */

const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Application health check
 *     description: Returns the current health status of the CoreSY API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/', healthController.getHealth);

module.exports = router;
