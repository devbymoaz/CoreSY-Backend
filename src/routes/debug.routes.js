/**
 * Debug routes - help diagnose issues!
 */

const express = require('express');
const { getDebugInfo } = require('../controllers/debug.controller');

const router = express.Router();

/**
 * @swagger
 * /debug:
 *   get:
 *     summary: Get debug info
 *     description: Returns environment info (no secrets exposed!) to diagnose issues
 *     tags: [Debug]
 *     responses:
 *       200:
 *         description: Debug info retrieved successfully
 */
router.get('/', getDebugInfo);

module.exports = router;
