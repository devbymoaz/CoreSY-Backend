/**
 * API route aggregator.
 * Mounts all feature routes under the configured API prefix.
 */

const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const governorateRoutes = require('./governorate.routes');
const debugRoutes = require('./debug.routes');
const rbacRoutes = require('../modules/rbac/routes');

const router = express.Router();

// Mount feature routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/governorates', governorateRoutes);
router.use('/debug', debugRoutes);
router.use('/', rbacRoutes.router);
router.use('/users', rbacRoutes.userRoleRoutes);

module.exports = router;
