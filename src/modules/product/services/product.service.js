/**
 * Product service.
 * Business logic for CoreSY Go product catalog management.
 */

const productRepository = require('../repositories/product.repository');
const productCategoryRepository = require('../repositories/product-category.repository');
const businessRepository = require('../../business/repositories/business.repository');
const branchRepository = require('../../branch/repositories/branch.repository');
const auditLogService = require('../../rbac/services/audit-log.service');
const { removePublicUpload } = require('../../../middlewares/upload.middleware');
const AppError = require('../../../utils/AppError');
const logger = require('../../../utils/logger');
const { prisma } = require('../../../prisma');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
  PRODUCT_STATUS,
  PERMISSION_MODULES,
} = require('../../../constants');

const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER];
const READ_ONLY_ROLES = [ROLES.SUPPORT_ADMIN, ROLES.FINANCE_ADMIN];
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SUPPORT_ADMIN, ROLES.FINANCE_ADMIN];

class ProductService {
  _hasRole(user, roles) {
    return roles.some((role) => user.roles?.includes(role));
  }

  _isReadOnly(user) {
    return this._hasRole(user, READ_ONLY_ROLES) && !this._hasRole(user, WRITE_ROLES);
  }

  _assertWriteAccess(user) {
    if (this._isReadOnly(user)) {
      throw new AppError(ERROR_MESSAGES.PRODUCT_READ_ONLY, HTTP_STATUS.FORBIDDEN);
    }

    if (!this._hasRole(user, WRITE_ROLES) && !this._hasRole(user, [ROLES.USER])) {
      // USER cannot write; only write roles can
    }

    if (!this._hasRole(user, WRITE_ROLES)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }
  }

  async _getOwnedBusinessIds(userId) {
    const businesses = await prisma.business.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    return businesses.map((business) => business.id);
  }

  async _assertBusinessAccess(business, user) {
    if (this._hasRole(user, ADMIN_ROLES)) return;
    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && business.ownerId === user.id) return;
    if (this._hasRole(user, [ROLES.BUSINESS_MANAGER])) return;

    throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }

  async _assertProductAccess(product, user, { write = false } = {}) {
    if (write) this._assertWriteAccess(user);

    if (this._hasRole(user, ADMIN_ROLES)) return;
    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && product.business.ownerId === user.id) return;
    if (this._hasRole(user, [ROLES.BUSINESS_MANAGER])) return;

    if (!write && this._hasRole(user, [ROLES.USER]) && product.status === PRODUCT_STATUS.ACTIVE) {
      return;
    }

    throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
  }

  async _applyAccessFilters(query, user, { customerView = false } = {}) {
    const filters = { ...query };

    const isCustomerOnly =
      this._hasRole(user, [ROLES.USER]) && !this._hasRole(user, WRITE_ROLES.concat(ADMIN_ROLES));

    if (customerView || isCustomerOnly) {
      filters.customerView = true;
      return filters;
    }

    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, [ROLES.SUPER_ADMIN])) {
      const businessIds = await this._getOwnedBusinessIds(user.id);
      filters.businessIds = businessIds;
    }

    return filters;
  }

  async _validateCategory(categoryId, businessId, { mustBeMain = false, mustBeSub = false } = {}) {
    const category = await productCategoryRepository.findById(categoryId);
    if (!category) {
      throw new AppError(ERROR_MESSAGES.PRODUCT_CATEGORY_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    if (category.businessId && category.businessId !== businessId) {
      throw new AppError(ERROR_MESSAGES.PRODUCT_CATEGORY_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    if (mustBeMain && category.parentId) {
      throw new AppError('Main category must not have a parent', HTTP_STATUS.BAD_REQUEST);
    }

    if (mustBeSub && !category.parentId) {
      throw new AppError('Sub category must have a parent category', HTTP_STATUS.BAD_REQUEST);
    }

    return category;
  }

  async _generateProductCode(branchId) {
    const latest = await productRepository.findLatestByBranch(branchId);
    let nextNumber = 1;

    if (latest?.code) {
      const match = latest.code.match(/(\d+)$/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }

    const branch = await branchRepository.findById(branchId);
    const prefix = branch?.code?.substring(0, 3)?.toUpperCase() || 'PRD';
    return `${prefix}-P${String(nextNumber).padStart(5, '0')}`;
  }

  _resolveStatus(data) {
    if (data.status) return data.status;
    if (!data.unlimitedStock && Number(data.stockQuantity || 0) <= 0) {
      return PRODUCT_STATUS.OUT_OF_STOCK;
    }
    return PRODUCT_STATUS.ACTIVE;
  }

  async _notifyBusinessOwner(business, title, message, type, data = {}) {
    try {
      await prisma.notification.create({
        data: {
          userId: business.ownerId,
          title,
          message,
          type,
          data,
        },
      });
    } catch (error) {
      logger.error('Failed to create product notification:', error);
    }
  }

  async _audit(userId, action, payload, ipAddress, userAgent) {
    const entry = {
      userId,
      action,
      module: PERMISSION_MODULES.PRODUCTS,
      ipAddress,
      userAgent,
      payload,
    };
    if (typeof auditLogService.create === 'function') {
      await auditLogService.create(entry);
    } else {
      await auditLogService.logAction(entry);
    }
  }

  async createProduct(data, userId, ipAddress, userAgent, user) {
    this._assertWriteAccess(user);

    const business = await businessRepository.findById(data.businessId);
    if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertBusinessAccess(business, user);

    const branch = await branchRepository.findById(data.branchId);
    if (!branch || branch.businessId !== data.businessId) {
      throw new AppError(ERROR_MESSAGES.BRANCH_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    await this._validateCategory(data.categoryId, data.businessId, { mustBeMain: true });
    if (data.subCategoryId) {
      const subCategory = await this._validateCategory(data.subCategoryId, data.businessId, {
        mustBeSub: true,
      });
      if (subCategory.parentId !== data.categoryId) {
        throw new AppError(
          'Sub category must belong to the selected main category',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    }

    const existingSku = await productRepository.findBySku(data.sku, data.businessId);
    if (existingSku) {
      throw new AppError(ERROR_MESSAGES.PRODUCT_SKU_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const code = await this._generateProductCode(data.branchId);
    const status = this._resolveStatus(data);

    const product = await productRepository.create({
      ...data,
      code,
      status,
      images: data.images || [],
      tags: data.tags || [],
      createdBy: userId,
    });

    await this._audit(
      userId,
      'PRODUCT_CREATED',
      { productId: product.id, sku: product.sku },
      ipAddress,
      userAgent,
    );
    await this._notifyBusinessOwner(
      business,
      'Product Created',
      `Product "${product.name}" was created successfully.`,
      'PRODUCT_CREATED',
      { productId: product.id },
    );

    return { message: SUCCESS_MESSAGES.PRODUCT_CREATED, product };
  }

  async getProducts(query, user) {
    const filters = await this._applyAccessFilters(query, user);
    return productRepository.findAll(filters);
  }

  async getCustomerProducts(query) {
    return productRepository.findAll({ ...query, customerView: true });
  }

  async getProductById(id, user, { customerView = false } = {}) {
    const product = await productRepository.findById(id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (customerView) {
      if (product.status !== PRODUCT_STATUS.ACTIVE) {
        throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }
      return product;
    }

    await this._assertProductAccess(product, user);
    return product;
  }

  async updateProduct(id, data, userId, ipAddress, userAgent, user) {
    const product = await productRepository.findById(id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertProductAccess(product, user, { write: true });

    if (data.sku) {
      const existingSku = await productRepository.findBySku(data.sku, product.businessId, id);
      if (existingSku) {
        throw new AppError(ERROR_MESSAGES.PRODUCT_SKU_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (data.categoryId) {
      await this._validateCategory(data.categoryId, product.businessId, { mustBeMain: true });
    }

    if (data.subCategoryId) {
      const categoryId = data.categoryId || product.categoryId;
      const subCategory = await this._validateCategory(data.subCategoryId, product.businessId, {
        mustBeSub: true,
      });
      if (subCategory.parentId !== categoryId) {
        throw new AppError(
          'Sub category must belong to the selected main category',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    }

    const updatedProduct = await productRepository.update(id, {
      ...data,
      updatedBy: userId,
    });

    await this._audit(userId, 'PRODUCT_UPDATED', { productId: id }, ipAddress, userAgent);
    await this._notifyBusinessOwner(
      product.business,
      'Product Updated',
      `Product "${updatedProduct.name}" was updated.`,
      'PRODUCT_UPDATED',
      { productId: id },
    );

    return { message: SUCCESS_MESSAGES.PRODUCT_UPDATED, product: updatedProduct };
  }

  async deleteProduct(id, userId, ipAddress, userAgent, user) {
    const product = await productRepository.findById(id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertProductAccess(product, user, { write: true });

    await productRepository.softDelete(id, userId);
    await Promise.all((product.images || []).map((image) => removePublicUpload(image)));
    await this._audit(userId, 'PRODUCT_DELETED', { productId: id }, ipAddress, userAgent);

    return { message: SUCCESS_MESSAGES.PRODUCT_DELETED };
  }

  async updateStatus(id, status, userId, ipAddress, userAgent, user) {
    const product = await productRepository.findById(id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertProductAccess(product, user, { write: true });

    const updatedProduct = await productRepository.update(id, {
      status,
      updatedBy: userId,
    });

    await this._audit(
      userId,
      'PRODUCT_STATUS_CHANGED',
      { productId: id, previousStatus: product.status, status },
      ipAddress,
      userAgent,
    );

    return { message: SUCCESS_MESSAGES.PRODUCT_STATUS_UPDATED, product: updatedProduct };
  }

  async updateStock(id, data, userId, ipAddress, userAgent, user) {
    const product = await productRepository.findById(id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertProductAccess(product, user, { write: true });

    const previousStock = product.stockQuantity;
    const newStock = data.stockQuantity;
    const unlimitedStock =
      typeof data.unlimitedStock === 'boolean' ? data.unlimitedStock : product.unlimitedStock;

    let status = product.status;
    if (!unlimitedStock && newStock <= 0) {
      status = PRODUCT_STATUS.OUT_OF_STOCK;
    } else if (product.status === PRODUCT_STATUS.OUT_OF_STOCK && (unlimitedStock || newStock > 0)) {
      status = PRODUCT_STATUS.ACTIVE;
    }

    const updatedProduct = await productRepository.update(id, {
      stockQuantity: newStock,
      unlimitedStock,
      status,
      updatedBy: userId,
    });

    await productRepository.createInventoryLog({
      productId: id,
      previousStock,
      newStock,
      changeAmount: newStock - previousStock,
      reason: data.reason || 'Manual stock update',
      createdBy: userId,
    });

    await this._audit(
      userId,
      'PRODUCT_STOCK_UPDATED',
      { productId: id, previousStock, newStock },
      ipAddress,
      userAgent,
    );

    if (!unlimitedStock && newStock <= 0) {
      await this._notifyBusinessOwner(
        product.business,
        'Product Out Of Stock',
        `Product "${product.name}" is out of stock.`,
        'PRODUCT_OUT_OF_STOCK',
        { productId: id },
      );
    } else if (!unlimitedStock && newStock <= product.lowStockThreshold) {
      await this._notifyBusinessOwner(
        product.business,
        'Product Low Stock',
        `Product "${product.name}" is low on stock (${newStock} remaining).`,
        'PRODUCT_LOW_STOCK',
        { productId: id, stockQuantity: newStock },
      );
    }

    return { message: SUCCESS_MESSAGES.PRODUCT_STOCK_UPDATED, product: updatedProduct };
  }

  async uploadImages(id, images, userId, ipAddress, userAgent, user) {
    const product = await productRepository.findById(id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertProductAccess(product, user, { write: true });

    const mergedImages = [...new Set([...(product.images || []), ...images])].slice(0, 20);
    const updatedProduct = await productRepository.update(id, {
      images: mergedImages,
      updatedBy: userId,
    });

    await this._audit(userId, 'PRODUCT_IMAGES_UPDATED', { productId: id }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.PRODUCT_IMAGES_UPDATED, product: updatedProduct };
  }

  async removeImages(id, images, userId, ipAddress, userAgent, user) {
    const product = await productRepository.findById(id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertProductAccess(product, user, { write: true });

    const remainingImages = (product.images || []).filter((image) => !images.includes(image));
    const updatedProduct = await productRepository.update(id, {
      images: remainingImages,
      updatedBy: userId,
    });
    await Promise.all(images.map((image) => removePublicUpload(image)));

    await this._audit(userId, 'PRODUCT_IMAGES_REMOVED', { productId: id }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.PRODUCT_IMAGES_REMOVED, product: updatedProduct };
  }

  async duplicateProduct(id, userId, ipAddress, userAgent, user) {
    const product = await productRepository.findById(id);
    if (!product) throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await this._assertProductAccess(product, user, { write: true });

    const code = await this._generateProductCode(product.branchId);
    const sku = `${product.sku}-COPY-${Date.now().toString().slice(-6)}`;

    const duplicated = await productRepository.create({
      name: `${product.name} (Copy)`,
      sku,
      code,
      description: product.description,
      businessId: product.businessId,
      branchId: product.branchId,
      categoryId: product.categoryId,
      subCategoryId: product.subCategoryId,
      images: product.images || [],
      basePrice: product.basePrice,
      discountPrice: product.discountPrice,
      subscriberPrice: product.subscriberPrice,
      stockQuantity: product.stockQuantity,
      unlimitedStock: product.unlimitedStock,
      lowStockThreshold: product.lowStockThreshold,
      preparationTime: product.preparationTime,
      unit: product.unit,
      weight: product.weight,
      tags: product.tags || [],
      barcode: null,
      status: PRODUCT_STATUS.INACTIVE,
      isFeatured: false,
      isRecommended: false,
      createdBy: userId,
    });

    await this._audit(
      userId,
      'PRODUCT_DUPLICATED',
      { productId: duplicated.id, sourceProductId: id },
      ipAddress,
      userAgent,
    );

    return { message: SUCCESS_MESSAGES.PRODUCT_DUPLICATED, product: duplicated };
  }

  async bulkUpdate(productIds, data, userId, ipAddress, userAgent, user) {
    this._assertWriteAccess(user);

    const products = await Promise.all(productIds.map((id) => productRepository.findById(id)));
    const validProducts = products.filter(Boolean);

    for (const product of validProducts) {
      await this._assertProductAccess(product, user, { write: true });
    }

    const ids = validProducts.map((product) => product.id);
    await productRepository.updateMany(ids, { ...data, updatedBy: userId });

    await this._audit(
      userId,
      'PRODUCT_BULK_UPDATED',
      { productIds: ids, data },
      ipAddress,
      userAgent,
    );

    return {
      message: SUCCESS_MESSAGES.PRODUCT_BULK_UPDATED,
      updatedCount: ids.length,
    };
  }

  async importProducts(products, userId, ipAddress, userAgent, user) {
    this._assertWriteAccess(user);

    const created = [];
    const errors = [];

    for (let index = 0; index < products.length; index += 1) {
      try {
        const result = await this.createProduct(
          products[index],
          userId,
          ipAddress,
          userAgent,
          user,
        );
        created.push(result.product);
      } catch (error) {
        errors.push({
          index,
          sku: products[index]?.sku,
          message: error.message,
        });
      }
    }

    await this._audit(
      userId,
      'PRODUCT_IMPORTED',
      { createdCount: created.length, errorCount: errors.length },
      ipAddress,
      userAgent,
    );

    return {
      message: SUCCESS_MESSAGES.PRODUCT_IMPORTED,
      createdCount: created.length,
      errorCount: errors.length,
      products: created,
      errors,
    };
  }

  async exportProducts(query, user) {
    const filters = await this._applyAccessFilters(query, user);
    const products = await productRepository.exportProducts(filters);
    return {
      message: SUCCESS_MESSAGES.PRODUCT_EXPORTED,
      count: products.length,
      products,
    };
  }

  async getFeaturedProducts(query = {}) {
    return productRepository.findAll({
      ...query,
      isFeatured: true,
      customerView: true,
    });
  }

  async getRecommendedProducts(query = {}) {
    return productRepository.findAll({
      ...query,
      isRecommended: true,
      customerView: true,
    });
  }

  async getDashboardStats(query, user) {
    const filters = {};

    if (this._hasRole(user, [ROLES.BUSINESS_OWNER]) && !this._hasRole(user, [ROLES.SUPER_ADMIN])) {
      filters.businessIds = await this._getOwnedBusinessIds(user.id);
    }

    if (query.businessId) filters.businessId = query.businessId;
    if (query.branchId) filters.branchId = query.branchId;

    return productRepository.getDashboardStats(filters);
  }

  // Category management
  _slugify(value) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async createCategory(data, userId, ipAddress, userAgent, user) {
    this._assertWriteAccess(user);

    if (data.businessId) {
      const business = await businessRepository.findById(data.businessId);
      if (!business) throw new AppError(ERROR_MESSAGES.BUSINESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      await this._assertBusinessAccess(business, user);
    } else if (!this._hasRole(user, [ROLES.SUPER_ADMIN])) {
      throw new AppError('Only SUPER_ADMIN can create global categories', HTTP_STATUS.FORBIDDEN);
    }

    if (data.parentId) {
      const parent = await productCategoryRepository.findById(data.parentId);
      if (!parent)
        throw new AppError(ERROR_MESSAGES.PRODUCT_CATEGORY_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
    }

    const slug = data.slug || this._slugify(data.name);
    const existing = await productCategoryRepository.findBySlug(slug, data.businessId || null);
    if (existing) {
      throw new AppError(ERROR_MESSAGES.PRODUCT_CATEGORY_SLUG_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const category = await productCategoryRepository.create({
      ...data,
      slug,
      createdBy: userId,
    });

    await this._audit(
      userId,
      'PRODUCT_CATEGORY_CREATED',
      { categoryId: category.id },
      ipAddress,
      userAgent,
    );
    return { message: SUCCESS_MESSAGES.PRODUCT_CATEGORY_CREATED, category };
  }

  async getCategories(query) {
    return productCategoryRepository.findAll(query);
  }

  async getCategoryTree(businessId) {
    return productCategoryRepository.findActiveTree(businessId);
  }

  async getCategoryById(id) {
    const category = await productCategoryRepository.findById(id);
    if (!category)
      throw new AppError(ERROR_MESSAGES.PRODUCT_CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return category;
  }

  async updateCategory(id, data, userId, ipAddress, userAgent, user) {
    this._assertWriteAccess(user);

    const category = await productCategoryRepository.findById(id);
    if (!category)
      throw new AppError(ERROR_MESSAGES.PRODUCT_CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (category.businessId) {
      const business = await businessRepository.findById(category.businessId);
      if (business) await this._assertBusinessAccess(business, user);
    } else if (!this._hasRole(user, [ROLES.SUPER_ADMIN])) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    if (data.slug || data.name) {
      const slug = data.slug || this._slugify(data.name || category.name);
      const existing = await productCategoryRepository.findBySlug(slug, category.businessId, id);
      if (existing) {
        throw new AppError(ERROR_MESSAGES.PRODUCT_CATEGORY_SLUG_EXISTS, HTTP_STATUS.CONFLICT);
      }
      data.slug = slug;
    }

    const updated = await productCategoryRepository.update(id, {
      ...data,
      updatedBy: userId,
    });

    await this._audit(userId, 'PRODUCT_CATEGORY_UPDATED', { categoryId: id }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.PRODUCT_CATEGORY_UPDATED, category: updated };
  }

  async uploadCategoryImage(id, imageUrl, userId, ipAddress, userAgent, user) {
    const category = await productCategoryRepository.findById(id);
    if (!category) {
      throw new AppError(ERROR_MESSAGES.PRODUCT_CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const result = await this.updateCategory(
      id,
      { image: imageUrl },
      userId,
      ipAddress,
      userAgent,
      user,
    );
    await removePublicUpload(category.image);
    return result;
  }

  async deleteCategory(id, userId, ipAddress, userAgent, user) {
    this._assertWriteAccess(user);

    const category = await productCategoryRepository.findById(id);
    if (!category)
      throw new AppError(ERROR_MESSAGES.PRODUCT_CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    if (category.businessId) {
      const business = await businessRepository.findById(category.businessId);
      if (business) await this._assertBusinessAccess(business, user);
    } else if (!this._hasRole(user, [ROLES.SUPER_ADMIN])) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    }

    await productCategoryRepository.softDelete(id, userId);
    await removePublicUpload(category.image);
    await this._audit(userId, 'PRODUCT_CATEGORY_DELETED', { categoryId: id }, ipAddress, userAgent);
    return { message: SUCCESS_MESSAGES.PRODUCT_CATEGORY_DELETED };
  }
}

module.exports = new ProductService();
