/**
 * Product category routes.
 * Main and sub category management for CoreSY Go products.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  createCategory,
  getCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require('../controllers/product.controller');
const {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
} = require('../validators/product.validator');
const { ROLES } = require('../../../constants');

const writeRoles = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER];
const readRoles = [
  ROLES.SUPER_ADMIN,
  ROLES.BUSINESS_OWNER,
  ROLES.BUSINESS_MANAGER,
  ROLES.SUPPORT_ADMIN,
  ROLES.FINANCE_ADMIN,
  ROLES.USER,
];

router.use(authenticate);

/**
 * @swagger
 * /product-categories:
 *   get:
 *     summary: List product categories
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: mainOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Categories retrieved
 */
router.get(
  '/',
  authorizeRoles(...readRoles),
  validate({ query: listCategoriesSchema }),
  getCategories,
);

/**
 * @swagger
 * /product-categories/tree:
 *   get:
 *     summary: Get active category tree
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category tree retrieved
 */
router.get('/tree', authorizeRoles(...readRoles), getCategoryTree);

/**
 * @swagger
 * /product-categories:
 *   post:
 *     summary: Create a product category
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *               nameAr:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 nullable: true
 *               slug:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 nullable: true
 *               image:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               sortOrder:
 *                 type: integer
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *               businessId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *           example:
 *             name: Beverages
 *             nameAr: مشروبات
 *             slug: beverages
 *             description: Drinks and juices
 *             image: https://cdn.coresy.io/categories/beverages.jpg
 *             sortOrder: 1
 *             businessId: a7f11770-5f94-445d-bd33-307cdba8f601
 *             parentId: null
 *     responses:
 *       201:
 *         description: Category created
 */
router.post(
  '/',
  authorizeRoles(...writeRoles),
  validate({ body: createCategorySchema }),
  createCategory,
);

/**
 * @swagger
 * /product-categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Product Categories]
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
 *         description: Category details
 */
router.get('/:id', authorizeRoles(...readRoles), getCategoryById);

/**
 * @swagger
 * /product-categories/{id}:
 *   patch:
 *     summary: Update a product category
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: a7f11770-5f94-445d-bd33-307cdba8f600
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *               nameAr:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 nullable: true
 *               slug:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 nullable: true
 *               image:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               sortOrder:
 *                 type: integer
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *               businessId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *           example:
 *             name: Fresh Beverages
 *             sortOrder: 2
 *             isActive: true
 *     responses:
 *       200:
 *         description: Category updated
 */
router.patch(
  '/:id',
  authorizeRoles(...writeRoles),
  validate({ body: updateCategorySchema }),
  updateCategory,
);

/**
 * @swagger
 * /product-categories/{id}:
 *   delete:
 *     summary: Soft delete a product category
 *     tags: [Product Categories]
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
 *         description: Category deleted
 */
router.delete('/:id', authorizeRoles(...writeRoles), deleteCategory);

module.exports = router;
