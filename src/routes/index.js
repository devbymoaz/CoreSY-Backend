/**
 * API route aggregator.
 * Mounts all feature routes under the configured API prefix.
 */

const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const governorateRoutes = require('./governorate.routes');
const debugRoutes = require('./debug.routes');

const router = express.Router();

// Mount feature routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/governorates', governorateRoutes);
router.use('/debug', debugRoutes);

module.exports = router;
