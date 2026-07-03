/**
 * Product management routes.
 * CoreSY Go product catalog APIs with Swagger documentation.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/zod-validate.middleware');
const { authorizeRoles } = require('../../rbac/middlewares/rbac.middleware');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  updateProductStock,
  uploadProductImages,
  removeProductImages,
  duplicateProduct,
  bulkUpdateProducts,
  importProducts,
  exportProducts,
  getFeaturedProducts,
  getRecommendedProducts,
  getDashboardStats,
  getCategoryTree,
} = require('../controllers/product.controller');
const {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  updateProductStockSchema,
  uploadProductImagesSchema,
  removeProductImagesSchema,
  listProductsSchema,
  bulkUpdateProductsSchema,
  importProductsSchema,
} = require('../validators/product.validator');
const { ROLES } = require('../../../constants');

const managementRoles = [
  ROLES.SUPER_ADMIN,
  ROLES.BUSINESS_OWNER,
  ROLES.BUSINESS_MANAGER,
  ROLES.SUPPORT_ADMIN,
  ROLES.FINANCE_ADMIN,
];

const writeRoles = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER];

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: CoreSY Go product management
 *   - name: Product Categories
 *     description: Product category management
 */

/**
 * @swagger
 * /products/dashboard:
 *   get:
 *     summary: Get product dashboard statistics
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 stats:
 *                   totalProducts: 120
 *                   activeProducts: 95
 *                   outOfStockProducts: 8
 *                   lowStockProducts: 12
 *                   featuredProducts: 10
 *                   recommendedProducts: 15
 */
router.get('/dashboard', authorizeRoles(...managementRoles), getDashboardStats);

/**
 * @swagger
 * /products/categories:
 *   get:
 *     summary: Get active product category tree (customer)
 *     tags: [Products]
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
router.get('/categories', getCategoryTree);

/**
 * @swagger
 * /products/featured:
 *   get:
 *     summary: Get featured products (customer)
 *     tags: [Products]
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
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Featured products retrieved
 */
router.get('/featured', validate({ query: listProductsSchema }), getFeaturedProducts);

/**
 * @swagger
 * /products/recommended:
 *   get:
 *     summary: Get recommended products (customer)
 *     tags: [Products]
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
 *     responses:
 *       200:
 *         description: Recommended products retrieved
 */
router.get('/recommended', validate({ query: listProductsSchema }), getRecommendedProducts);

/**
 * @swagger
 * /products/export:
 *   get:
 *     summary: Export products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, OUT_OF_STOCK, HIDDEN, DELETED]
 *     responses:
 *       200:
 *         description: Products exported
 */
router.get(
  '/export',
  authorizeRoles(...managementRoles),
  validate({ query: listProductsSchema }),
  exportProducts,
);

/**
 * @swagger
 * /products/import:
 *   post:
 *     summary: Import products in bulk
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [products]
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *           example:
 *             products:
 *               - name: Fresh Orange Juice
 *                 sku: JCE-ORG-001
 *                 businessId: 550e8400-e29b-41d4-a716-446655440000
 *                 branchId: 550e8400-e29b-41d4-a716-446655440001
 *                 categoryId: 550e8400-e29b-41d4-a716-446655440002
 *                 basePrice: 25
 *                 stockQuantity: 50
 *     responses:
 *       201:
 *         description: Products imported
 */
router.post(
  '/import',
  authorizeRoles(...writeRoles),
  validate({ body: importProductsSchema }),
  importProducts,
);

/**
 * @swagger
 * /products/bulk-update:
 *   patch:
 *     summary: Bulk update products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             productIds:
 *               - 550e8400-e29b-41d4-a716-446655440010
 *             data:
 *               status: ACTIVE
 *               isFeatured: true
 *     responses:
 *       200:
 *         description: Products updated
 */
router.patch(
  '/bulk-update',
  authorizeRoles(...writeRoles),
  validate({ body: bulkUpdateProductsSchema }),
  bulkUpdateProducts,
);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List products with search, filters, pagination, and sorting
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, SKU, category, business, branch, or barcode
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, OUT_OF_STOCK, HIDDEN, DELETED]
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: [in_stock, out_of_stock, low_stock]
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, name, basePrice, stockQuantity, status]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Products retrieved
 */
router.get('/', validate({ query: listProductsSchema }), getProducts);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: Fresh Orange Juice
 *             sku: JCE-ORG-001
 *             description: Freshly squeezed orange juice
 *             businessId: 550e8400-e29b-41d4-a716-446655440000
 *             branchId: 550e8400-e29b-41d4-a716-446655440001
 *             categoryId: 550e8400-e29b-41d4-a716-446655440002
 *             subCategoryId: 550e8400-e29b-41d4-a716-446655440003
 *             images:
 *               - https://cdn.coresy.io/products/orange-1.jpg
 *             basePrice: 25
 *             discountPrice: 20
 *             subscriberPrice: 18
 *             stockQuantity: 100
 *             unlimitedStock: false
 *             preparationTime: 5
 *             unit: BOTTLE
 *             weight: 0.5
 *             tags: [juice, fresh, orange]
 *             barcode: "6281000000012"
 *             isFeatured: true
 *             isRecommended: true
 *     responses:
 *       201:
 *         description: Product created
 *       409:
 *         description: SKU already exists
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authorizeRoles(...writeRoles),
  validate({ body: createProductSchema }),
  createProduct,
);

/**
 * @swagger
 * /products/{id}/status:
 *   patch:
 *     summary: Change product status
 *     tags: [Products]
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
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             status: INACTIVE
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  '/:id/status',
  authorizeRoles(...writeRoles),
  validate({ body: updateProductStatusSchema }),
  updateProductStatus,
);

/**
 * @swagger
 * /products/{id}/stock:
 *   patch:
 *     summary: Manage product stock
 *     tags: [Products]
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
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             stockQuantity: 40
 *             unlimitedStock: false
 *             reason: Restocked from warehouse
 *     responses:
 *       200:
 *         description: Stock updated
 */
router.patch(
  '/:id/stock',
  authorizeRoles(...writeRoles),
  validate({ body: updateProductStockSchema }),
  updateProductStock,
);

/**
 * @swagger
 * /products/{id}/images:
 *   post:
 *     summary: Upload/add product images
 *     tags: [Products]
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
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             images:
 *               - https://cdn.coresy.io/products/orange-2.jpg
 *     responses:
 *       200:
 *         description: Images updated
 */
router.post(
  '/:id/images',
  authorizeRoles(...writeRoles),
  validate({ body: uploadProductImagesSchema }),
  uploadProductImages,
);

/**
 * @swagger
 * /products/{id}/images/remove:
 *   post:
 *     summary: Remove product images
 *     tags: [Products]
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
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             images:
 *               - https://cdn.coresy.io/products/orange-2.jpg
 *     responses:
 *       200:
 *         description: Images removed
 */
router.post(
  '/:id/images/remove',
  authorizeRoles(...writeRoles),
  validate({ body: removeProductImagesSchema }),
  removeProductImages,
);

/**
 * @swagger
 * /products/{id}/duplicate:
 *   post:
 *     summary: Duplicate a product
 *     tags: [Products]
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
 *       201:
 *         description: Product duplicated
 */
router.post('/:id/duplicate', authorizeRoles(...writeRoles), duplicateProduct);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
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
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', getProductById);

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     summary: Update a product
 *     tags: [Products]
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
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: Fresh Orange Juice Large
 *             basePrice: 30
 *             isFeatured: true
 *     responses:
 *       200:
 *         description: Product updated
 */
router.patch(
  '/:id',
  authorizeRoles(...writeRoles),
  validate({ body: updateProductSchema }),
  updateProduct,
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Soft delete a product
 *     tags: [Products]
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
 *         description: Product deleted
 */
router.delete('/:id', authorizeRoles(...writeRoles), deleteProduct);

module.exports = router;
