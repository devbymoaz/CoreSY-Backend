/**
 * Product repository.
 * Data access layer for CoreSY Go products and inventory logs.
 */

const { prisma } = require('../../../prisma');
const { PAGINATION, PRODUCT_STATUS } = require('../../../constants');

const PRODUCT_INCLUDE = {
  business: {
    select: {
      id: true,
      name: true,
      ownerId: true,
      type: true,
      status: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  },
  category: true,
  subCategory: true,
  variants: {
    where: { isActive: true },
  },
};

class ProductRepository {
  async create(data) {
    return prisma.product.create({
      data,
      include: PRODUCT_INCLUDE,
    });
  }

  async findById(id) {
    return prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
        status: { not: PRODUCT_STATUS.DELETED },
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async findBySku(sku, businessId, excludeId = null) {
    const where = {
      sku,
      businessId,
      deletedAt: null,
      status: { not: PRODUCT_STATUS.DELETED },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return prisma.product.findFirst({ where });
  }

  async findByCode(code) {
    return prisma.product.findFirst({
      where: {
        code,
        deletedAt: null,
        status: { not: PRODUCT_STATUS.DELETED },
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async findLatestByBranch(branchId) {
    return prisma.product.findFirst({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    businessId,
    branchId,
    categoryId,
    subCategoryId,
    status,
    minPrice,
    maxPrice,
    isFeatured,
    isRecommended,
    availability,
    barcode,
    businessIds,
    branchIds,
    includeHidden = false,
    customerView = false,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      status: { not: PRODUCT_STATUS.DELETED },
    };

    if (customerView) {
      where.status = PRODUCT_STATUS.ACTIVE;
      where.OR = [{ unlimitedStock: true }, { stockQuantity: { gt: 0 } }];
    } else if (!includeHidden) {
      where.status = { notIn: [PRODUCT_STATUS.DELETED] };
    }

    if (search) {
      const searchFilter = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
        { branch: { name: { contains: search, mode: 'insensitive' } } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];

      where.AND = [...(where.AND || []), { OR: searchFilter }];
    }

    if (businessId) where.businessId = businessId;
    if (businessIds) where.businessId = { in: businessIds };
    if (branchId) where.branchId = branchId;
    if (branchIds) where.branchId = { in: branchIds };
    if (categoryId) where.categoryId = categoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (status) where.status = status;
    if (barcode) where.barcode = barcode;
    if (typeof isFeatured === 'boolean') where.isFeatured = isFeatured;
    if (typeof isRecommended === 'boolean') where.isRecommended = isRecommended;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) where.basePrice.gte = minPrice;
      if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
    }

    if (availability === 'in_stock') {
      where.OR = [{ unlimitedStock: true }, { stockQuantity: { gt: 0 } }];
      where.status = PRODUCT_STATUS.ACTIVE;
    } else if (availability === 'out_of_stock') {
      where.unlimitedStock = false;
      where.stockQuantity = { lte: 0 };
    } else if (availability === 'low_stock') {
      where.unlimitedStock = false;
      where.stockQuantity = { gt: 0 };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    let filteredProducts = products;
    if (availability === 'low_stock') {
      filteredProducts = products.filter(
        (product) => !product.unlimitedStock && product.stockQuantity <= product.lowStockThreshold,
      );
    }

    return {
      products: filteredProducts,
      pagination: {
        page,
        limit,
        total: availability === 'low_stock' ? filteredProducts.length : total,
        pages:
          Math.ceil((availability === 'low_stock' ? filteredProducts.length : total) / limit) || 1,
      },
    };
  }

  async update(id, data) {
    return prisma.product.update({
      where: { id },
      data,
      include: PRODUCT_INCLUDE,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.product.update({
      where: { id },
      data: {
        status: PRODUCT_STATUS.DELETED,
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async updateMany(ids, data) {
    return prisma.product.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        status: { not: PRODUCT_STATUS.DELETED },
      },
      data,
    });
  }

  async createInventoryLog(data) {
    return prisma.productInventoryLog.create({ data });
  }

  async getDashboardStats({ businessId, branchId, businessIds } = {}) {
    const where = {
      deletedAt: null,
      status: { not: PRODUCT_STATUS.DELETED },
    };

    if (businessId) where.businessId = businessId;
    if (businessIds) where.businessId = { in: businessIds };
    if (branchId) where.branchId = branchId;

    const [total, active, outOfStock, featured, recommended, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.count({ where: { ...where, status: PRODUCT_STATUS.ACTIVE } }),
      prisma.product.count({
        where: {
          ...where,
          OR: [
            { status: PRODUCT_STATUS.OUT_OF_STOCK },
            { unlimitedStock: false, stockQuantity: { lte: 0 } },
          ],
        },
      }),
      prisma.product.count({ where: { ...where, isFeatured: true } }),
      prisma.product.count({ where: { ...where, isRecommended: true } }),
      prisma.product.findMany({
        where: { ...where, unlimitedStock: false },
        select: { stockQuantity: true, lowStockThreshold: true },
      }),
    ]);

    const lowStock = products.filter(
      (product) => product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold,
    ).length;

    return {
      totalProducts: total,
      activeProducts: active,
      outOfStockProducts: outOfStock,
      lowStockProducts: lowStock,
      featuredProducts: featured,
      recommendedProducts: recommended,
    };
  }

  async exportProducts(filters = {}) {
    const { products } = await this.findAll({
      ...filters,
      page: 1,
      limit: 10000,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      code: product.code,
      description: product.description,
      businessId: product.businessId,
      businessName: product.business?.name,
      branchId: product.branchId,
      branchName: product.branch?.name,
      categoryId: product.categoryId,
      categoryName: product.category?.name,
      subCategoryId: product.subCategoryId,
      subCategoryName: product.subCategory?.name,
      basePrice: Number(product.basePrice),
      discountPrice: product.discountPrice != null ? Number(product.discountPrice) : null,
      subscriberPrice: product.subscriberPrice != null ? Number(product.subscriberPrice) : null,
      stockQuantity: product.stockQuantity,
      unlimitedStock: product.unlimitedStock,
      preparationTime: product.preparationTime,
      unit: product.unit,
      weight: product.weight != null ? Number(product.weight) : null,
      tags: product.tags,
      barcode: product.barcode,
      status: product.status,
      isFeatured: product.isFeatured,
      isRecommended: product.isRecommended,
      images: product.images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));
  }
}

module.exports = new ProductRepository();
