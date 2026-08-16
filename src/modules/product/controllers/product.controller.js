/**
 * Product controller.
 * Thin HTTP layer for CoreSY Go product management.
 */

const productService = require('../services/product.service');
const { sendSuccess, sendCreated } = require('../../../helpers/response.helper');
const asyncHandler = require('../../../utils/asyncHandler');
const {
  buildPublicFileUrl,
  buildPublicFileUrls,
  removeUploadedFile,
  removeUploadedFiles,
} = require('../../../middlewares/upload.middleware');

const createProduct = asyncHandler(async (req, res) => {
  const result = await productService.createProduct(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query, req.user);
  return sendSuccess(res, result);
});

const getCustomerProducts = asyncHandler(async (req, res) => {
  const result = await productService.getCustomerProducts(req.query);
  return sendSuccess(res, result);
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id, req.user);
  return sendSuccess(res, { product });
});

const getCustomerProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id, req.user, {
    customerView: true,
  });
  return sendSuccess(res, { product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const result = await productService.updateProduct(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const updateProductStatus = asyncHandler(async (req, res) => {
  const result = await productService.updateStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const updateProductStock = asyncHandler(async (req, res) => {
  const result = await productService.updateStock(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const uploadProductImages = asyncHandler(async (req, res) => {
  const result = await productService.uploadImages(
    req.params.id,
    req.body.images,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const uploadProductImageFiles = asyncHandler(async (req, res) => {
  try {
    const result = await productService.uploadImages(
      req.params.id,
      buildPublicFileUrls(req, req.files),
      req.user.id,
      req.ip,
      req.headers['user-agent'],
      req.user,
    );
    return sendSuccess(res, result);
  } catch (error) {
    await removeUploadedFiles(req.files);
    throw error;
  }
});

const removeProductImages = asyncHandler(async (req, res) => {
  const result = await productService.removeImages(
    req.params.id,
    req.body.images,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const duplicateProduct = asyncHandler(async (req, res) => {
  const result = await productService.duplicateProduct(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const bulkUpdateProducts = asyncHandler(async (req, res) => {
  const result = await productService.bulkUpdate(
    req.body.productIds,
    req.body.data,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const importProducts = asyncHandler(async (req, res) => {
  const result = await productService.importProducts(
    req.body.products,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const exportProducts = asyncHandler(async (req, res) => {
  const result = await productService.exportProducts(req.query, req.user);
  return sendSuccess(res, result);
});

const getFeaturedProducts = asyncHandler(async (req, res) => {
  const result = await productService.getFeaturedProducts(req.query);
  return sendSuccess(res, result);
});

const getRecommendedProducts = asyncHandler(async (req, res) => {
  const result = await productService.getRecommendedProducts(req.query);
  return sendSuccess(res, result);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await productService.getDashboardStats(req.query, req.user);
  return sendSuccess(res, { stats });
});

const createCategory = asyncHandler(async (req, res) => {
  const result = await productService.createCategory(
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendCreated(res, result);
});

const getCategories = asyncHandler(async (req, res) => {
  const result = await productService.getCategories(req.query);
  return sendSuccess(res, result);
});

const getCategoryTree = asyncHandler(async (req, res) => {
  const categories = await productService.getCategoryTree(req.query.businessId);
  return sendSuccess(res, { categories });
});

const getCategoryById = asyncHandler(async (req, res) => {
  const category = await productService.getCategoryById(req.params.id);
  return sendSuccess(res, { category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const result = await productService.updateCategory(
    req.params.id,
    req.body,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const result = await productService.deleteCategory(
    req.params.id,
    req.user.id,
    req.ip,
    req.headers['user-agent'],
    req.user,
  );
  return sendSuccess(res, result);
});

const uploadCategoryImage = asyncHandler(async (req, res) => {
  try {
    const result = await productService.uploadCategoryImage(
      req.params.id,
      buildPublicFileUrl(req, req.file),
      req.user.id,
      req.ip,
      req.headers['user-agent'],
      req.user,
    );
    return sendSuccess(res, result);
  } catch (error) {
    await removeUploadedFile(req.file);
    throw error;
  }
});

module.exports = {
  createProduct,
  getProducts,
  getCustomerProducts,
  getProductById,
  getCustomerProductById,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  updateProductStock,
  uploadProductImages,
  uploadProductImageFiles,
  removeProductImages,
  duplicateProduct,
  bulkUpdateProducts,
  importProducts,
  exportProducts,
  getFeaturedProducts,
  getRecommendedProducts,
  getDashboardStats,
  createCategory,
  getCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
};
