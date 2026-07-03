/**
 * Product category repository.
 * Data access layer for product main and sub categories.
 */

const { prisma } = require('../../../prisma');
const { PAGINATION } = require('../../../constants');

const CATEGORY_INCLUDE = {
  parent: true,
  children: {
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  },
  business: {
    select: { id: true, name: true, ownerId: true },
  },
};

class ProductCategoryRepository {
  async create(data) {
    return prisma.productCategory.create({
      data,
      include: CATEGORY_INCLUDE,
    });
  }

  async findById(id) {
    return prisma.productCategory.findFirst({
      where: { id, deletedAt: null },
      include: CATEGORY_INCLUDE,
    });
  }

  async findBySlug(slug, businessId = null, excludeId = null) {
    const where = {
      slug,
      businessId,
      deletedAt: null,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return prisma.productCategory.findFirst({ where });
  }

  async findAll({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    businessId,
    parentId,
    isActive,
    mainOnly = false,
    sortBy = 'sortOrder',
    sortOrder = 'asc',
  } = {}) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (businessId) where.businessId = businessId;
    if (parentId === null || parentId === 'null') {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }
    if (mainOnly) where.parentId = null;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const [categories, total] = await Promise.all([
      prisma.productCategory.findMany({
        where,
        include: CATEGORY_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.productCategory.count({ where }),
    ]);

    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findActiveTree(businessId = null) {
    const where = {
      deletedAt: null,
      isActive: true,
      parentId: null,
    };

    if (businessId) {
      where.OR = [{ businessId }, { businessId: null }];
    }

    return prisma.productCategory.findMany({
      where,
      include: {
        children: {
          where: { deletedAt: null, isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async update(id, data) {
    return prisma.productCategory.update({
      where: { id },
      data,
      include: CATEGORY_INCLUDE,
    });
  }

  async softDelete(id, deletedBy) {
    return prisma.productCategory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: deletedBy,
      },
    });
  }
}

module.exports = new ProductCategoryRepository();
