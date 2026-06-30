/**
 * RBAC Routes Index
 * Exports all RBAC routes
 */

const express = require('express');
const router = express.Router();

const roleRoutes = require('./role.routes');
const permissionRoutes = require('./permission.routes');
const userRoleRoutes = require('./user-role.routes');

router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);

module.exports = { router, userRoleRoutes };
