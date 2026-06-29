/**
 * Governorate routes.
 * Exposes endpoints for governorate management.
 */

const express = require('express');
const { getAllGovernorates } = require('../controllers/governorate.controller');

const router = express.Router();

/**
 * @swagger
 * /governorates:
 *   get:
 *     summary: Get all active governorates
 *     description: Returns a list of all active Syrian governorates with their codes and IDs
 *     tags: [Governorates]
 *     responses:
 *       200:
 *         description: List of governorates retrieved successfully
 */
router.get('/', getAllGovernorates);

module.exports = router;
