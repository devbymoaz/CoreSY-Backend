/**
 * Demo seed data for CoreSY platform testing.
 * Creates test accounts, businesses, services, and products.
 */

const bcrypt = require('bcrypt');

const TEST_PASSWORD = 'CoreSY@123';

const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@coresy.sy',
    phoneNumber: '+963911000001',
    fullName: 'CoreSY Admin',
    smartAssistantName: 'AdminBot',
    passId: 'DM-000001',
    role: 'SUPER_ADMIN',
  },
  customer: {
    email: 'customer@coresy.sy',
    phoneNumber: '+963911000002',
    fullName: 'Test Customer',
    smartAssistantName: 'CareBot',
    passId: 'DM-000002',
    role: 'USER',
  },
  businessOwner: {
    email: 'business@coresy.sy',
    phoneNumber: '+963911000003',
    fullName: 'Business Owner',
    smartAssistantName: 'BizBot',
    passId: 'DM-000003',
    role: 'BUSINESS_OWNER',
  },
  driver: {
    email: 'driver@coresy.sy',
    phoneNumber: '+963911000004',
    fullName: 'Test Driver',
    driverId: 'DRV-000001',
    nationalId: 'SY1234567890',
    drivingLicense: 'DL-SY-123456',
    vehicleRegistrationNumber: 'VEH-REG-001',
    vehiclePlateNumber: 'DM-12345',
  },
};

async function resolveAvailablePassId(prisma, desiredPassId, excludeUserId = null) {
  const passIdOwner = await prisma.user.findUnique({
    where: { passId: desiredPassId },
    select: { id: true },
  });

  if (!passIdOwner || (excludeUserId && passIdOwner.id === excludeUserId)) {
    return desiredPassId;
  }

  let attempt = 1;
  while (attempt < 1000) {
    const candidate = `SEED-${desiredPassId}-${attempt}`;
    const candidateOwner = await prisma.user.findUnique({
      where: { passId: candidate },
      select: { id: true },
    });

    if (!candidateOwner || (excludeUserId && candidateOwner.id === excludeUserId)) {
      return candidate;
    }

    attempt += 1;
  }

  throw new Error(`Unable to resolve an available passId for ${desiredPassId}`);
}

async function resolveAvailablePhone(prisma, desiredPhone, excludeUserId = null) {
  const phoneOwner = await prisma.user.findUnique({
    where: { phoneNumber: desiredPhone },
    select: { id: true },
  });

  if (!phoneOwner || (excludeUserId && phoneOwner.id === excludeUserId)) {
    return desiredPhone;
  }

  let attempt = 1;
  while (attempt < 1000) {
    const candidate = `+9639118${String(attempt).padStart(5, '0')}`;
    const candidateOwner = await prisma.user.findUnique({
      where: { phoneNumber: candidate },
      select: { id: true },
    });

    if (!candidateOwner || (excludeUserId && candidateOwner.id === excludeUserId)) {
      return candidate;
    }

    attempt += 1;
  }

  throw new Error(`Unable to resolve an available phone number for ${desiredPhone}`);
}

async function upsertTestUser(prisma, account, roleName, roleMap, damascus, passwordHash) {
  const roleId = roleMap[roleName];
  if (!roleId) {
    throw new Error(`Role ${roleName} not found`);
  }

  const userData = {
    fullName: account.fullName,
    password: passwordHash,
    emailVerified: true,
    phoneVerified: true,
    status: 'ACTIVE',
    governorateId: damascus.id,
    roleId,
    smartAssistantName: account.smartAssistantName,
  };

  const existingByEmail = await prisma.user.findUnique({
    where: { email: account.email },
  });

  if (existingByEmail) {
    const phoneOwner = await prisma.user.findUnique({
      where: { phoneNumber: account.phoneNumber },
      select: { id: true },
    });

    return prisma.user.update({
      where: { email: account.email },
      data: {
        ...userData,
        ...(phoneOwner && phoneOwner.id !== existingByEmail.id
          ? {}
          : { phoneNumber: account.phoneNumber }),
      },
    });
  }

  const passId = await resolveAvailablePassId(prisma, account.passId);
  if (passId !== account.passId) {
    console.log(
      `ℹ️ passId ${account.passId} already assigned; using ${passId} for ${account.email}`,
    );
  }

  const phoneNumber = await resolveAvailablePhone(prisma, account.phoneNumber);
  if (phoneNumber !== account.phoneNumber) {
    console.log(
      `ℹ️ phone ${account.phoneNumber} already assigned; using ${phoneNumber} for ${account.email}`,
    );
  }

  try {
    return await prisma.user.create({
      data: {
        passId,
        email: account.email,
        phoneNumber,
        subscription: 'FREE',
        acceptTerms: true,
        ...userData,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await prisma.user.findUnique({ where: { email: account.email } });
      if (existing) {
        return prisma.user.update({
          where: { email: account.email },
          data: userData,
        });
      }
    }

    throw error;
  }
}

async function upsertTestDriver(prisma, account, damascus, passwordHash, adminUserId) {
  const existingByEmail = await prisma.driver.findUnique({
    where: { email: account.email },
  });

  const driverData = {
    fullName: account.fullName,
    password: passwordHash,
    status: 'ACTIVE',
    availabilityStatus: 'ONLINE',
    isOnline: true,
    governorateId: damascus.id,
    approvedAt: new Date(),
    approvedBy: adminUserId,
  };

  if (existingByEmail) {
    return prisma.driver.update({
      where: { email: account.email },
      data: driverData,
    });
  }

  const createData = {
    ...driverData,
    email: account.email,
    phoneNumber: account.phoneNumber,
    driverId: account.driverId,
    nationalId: account.nationalId,
    drivingLicense: account.drivingLicense,
    vehicleType: 'MOTORCYCLE',
    vehicleBrand: 'Honda',
    vehicleModel: 'CB150',
    vehicleRegistrationNumber: account.vehicleRegistrationNumber,
    vehiclePlateNumber: account.vehiclePlateNumber,
    vehicleImages: [],
  };

  try {
    return await prisma.driver.create({ data: createData });
  } catch (error) {
    if (error.code !== 'P2002') {
      throw error;
    }

    const existing = await prisma.driver.findUnique({ where: { email: account.email } });
    if (existing) {
      return prisma.driver.update({
        where: { email: account.email },
        data: driverData,
      });
    }

    console.log(
      `ℹ️ Driver unique field conflict for ${account.email}; preserving existing driver record`,
    );
    return prisma.driver.findFirst({
      where: {
        OR: [
          { driverId: account.driverId },
          { nationalId: account.nationalId },
          { phoneNumber: account.phoneNumber },
        ],
      },
    });
  }
}

async function seedDemoData(prisma) {
  console.log('🧪 Seeding demo data and test accounts...');

  const damascus = await prisma.governorate.findUnique({ where: { code: 'DM' } });
  if (!damascus) {
    throw new Error('Damascus governorate not found. Seed governorates first.');
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const roles = await prisma.role.findMany();
  const roleMap = Object.fromEntries(roles.map((role) => [role.name, role.id]));

  const upsertUser = (account, roleName) =>
    upsertTestUser(prisma, account, roleName, roleMap, damascus, passwordHash);

  const adminUser = await upsertUser(TEST_ACCOUNTS.admin, TEST_ACCOUNTS.admin.role);
  const customerUser = await upsertUser(TEST_ACCOUNTS.customer, TEST_ACCOUNTS.customer.role);
  const businessOwner = await upsertUser(
    TEST_ACCOUNTS.businessOwner,
    TEST_ACCOUNTS.businessOwner.role,
  );

  for (const user of [adminUser, customerUser, businessOwner]) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: user.roleId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: user.roleId,
      },
    });
  }

  await prisma.wallet.upsert({
    where: { customerId: customerUser.id },
    update: {
      currentBalance: 50000,
      availableBalance: 50000,
      status: 'ACTIVE',
    },
    create: {
      walletId: 'WLT-CUSTOMER-001',
      customerId: customerUser.id,
      currentBalance: 50000,
      availableBalance: 50000,
      blockedBalance: 0,
      currency: 'SYP',
      status: 'ACTIVE',
    },
  });

  const restaurant = await prisma.business.upsert({
    where: { businessEmail: 'restaurant@coresy-demo.sy' },
    update: {
      status: 'ACTIVE',
      approvedBy: adminUser.id,
      approvalDate: new Date(),
    },
    create: {
      name: 'Damascus Delights',
      type: 'RESTAURANT',
      category: 'Syrian Cuisine',
      description: 'Authentic Syrian restaurant for CoreSY Pass reservations and dining.',
      ownerName: businessOwner.fullName,
      ownerEmail: businessOwner.email,
      ownerPhone: businessOwner.phoneNumber,
      businessEmail: 'restaurant@coresy-demo.sy',
      businessPhone: '+963114440001',
      registrationNumber: 'REG-REST-001',
      governorateId: damascus.id,
      city: 'Damascus',
      address: 'Al-Shaalan Street, Damascus',
      latitude: 33.5138,
      longitude: 36.2765,
      status: 'ACTIVE',
      ownerId: businessOwner.id,
      approvedBy: adminUser.id,
      approvalDate: new Date(),
    },
  });

  const clinic = await prisma.business.upsert({
    where: { businessEmail: 'clinic@coresy-demo.sy' },
    update: {
      status: 'ACTIVE',
      approvedBy: adminUser.id,
      approvalDate: new Date(),
    },
    create: {
      name: 'CoreSY Care Clinic',
      type: 'MEDICAL_CLINIC',
      category: 'Healthcare',
      description: 'General medical clinic for CoreSY Care appointments.',
      ownerName: businessOwner.fullName,
      ownerEmail: businessOwner.email,
      ownerPhone: businessOwner.phoneNumber,
      businessEmail: 'clinic@coresy-demo.sy',
      businessPhone: '+963114440002',
      registrationNumber: 'REG-CLINIC-001',
      governorateId: damascus.id,
      city: 'Damascus',
      address: 'Mazzeh Highway, Damascus',
      latitude: 33.5024,
      longitude: 36.2597,
      status: 'ACTIVE',
      ownerId: businessOwner.id,
      approvedBy: adminUser.id,
      approvalDate: new Date(),
    },
  });

  const supermarket = await prisma.business.upsert({
    where: { businessEmail: 'market@coresy-demo.sy' },
    update: {
      status: 'ACTIVE',
      approvedBy: adminUser.id,
      approvalDate: new Date(),
    },
    create: {
      name: 'QuickMart Supermarket',
      type: 'SUPERMARKET',
      category: 'Grocery',
      description: 'Grocery delivery store for CoreSY Go orders.',
      ownerName: businessOwner.fullName,
      ownerEmail: businessOwner.email,
      ownerPhone: businessOwner.phoneNumber,
      businessEmail: 'market@coresy-demo.sy',
      businessPhone: '+963114440003',
      registrationNumber: 'REG-MARKET-001',
      governorateId: damascus.id,
      city: 'Damascus',
      address: 'Abu Rummaneh, Damascus',
      latitude: 33.5222,
      longitude: 36.2865,
      status: 'ACTIVE',
      ownerId: businessOwner.id,
      approvedBy: adminUser.id,
      approvalDate: new Date(),
    },
  });

  const restaurantBranch = await prisma.branch.upsert({
    where: { code: 'BR-REST-MAIN' },
    update: { status: 'ACTIVE' },
    create: {
      name: 'Damascus Delights - Main Branch',
      code: 'BR-REST-MAIN',
      businessId: restaurant.id,
      type: 'RESTAURANT',
      description: 'Main dining branch',
      governorateId: damascus.id,
      city: 'Damascus',
      address: 'Al-Shaalan Street, Damascus',
      latitude: 33.5138,
      longitude: 36.2765,
      status: 'ACTIVE',
      isMain: true,
      openingTime: '09:00',
      closingTime: '23:00',
    },
  });

  const clinicBranch = await prisma.branch.upsert({
    where: { code: 'BR-CLINIC-MAIN' },
    update: { status: 'ACTIVE' },
    create: {
      name: 'CoreSY Care Clinic - Main',
      code: 'BR-CLINIC-MAIN',
      businessId: clinic.id,
      type: 'MEDICAL_CLINIC',
      description: 'Main clinic branch',
      governorateId: damascus.id,
      city: 'Damascus',
      address: 'Mazzeh Highway, Damascus',
      latitude: 33.5024,
      longitude: 36.2597,
      status: 'ACTIVE',
      isMain: true,
      openingTime: '08:00',
      closingTime: '20:00',
    },
  });

  const marketBranch = await prisma.branch.upsert({
    where: { code: 'BR-MARKET-MAIN' },
    update: { status: 'ACTIVE' },
    create: {
      name: 'QuickMart - Main Store',
      code: 'BR-MARKET-MAIN',
      businessId: supermarket.id,
      type: 'SUPERMARKET',
      description: 'Main grocery branch',
      governorateId: damascus.id,
      city: 'Damascus',
      address: 'Abu Rummaneh, Damascus',
      latitude: 33.5222,
      longitude: 36.2865,
      status: 'ACTIVE',
      isMain: true,
      openingTime: '08:00',
      closingTime: '22:00',
    },
  });

  await prisma.service.upsert({
    where: { code: 'SRV-TABLE-BOOKING' },
    update: { status: 'ACTIVE', isFeatured: true },
    create: {
      name: 'Table Reservation',
      code: 'SRV-TABLE-BOOKING',
      businessId: restaurant.id,
      branchId: restaurantBranch.id,
      category: 'FOOD_AND_DRINKS',
      type: 'RESTAURANT',
      description: 'Reserve a table for dine-in at Damascus Delights.',
      shortDescription: 'Dine-in table booking',
      price: 0,
      duration: 120,
      maxCapacity: 6,
      bookingRequired: true,
      appointmentRequired: false,
      deliveryAvailable: false,
      isFeatured: true,
      status: 'ACTIVE',
    },
  });

  await prisma.service.upsert({
    where: { code: 'SRV-GENERAL-CONSULT' },
    update: { status: 'ACTIVE', isFeatured: true },
    create: {
      name: 'General Consultation',
      code: 'SRV-GENERAL-CONSULT',
      businessId: clinic.id,
      branchId: clinicBranch.id,
      category: 'MEDICAL',
      type: 'MEDICAL_CONSULTATION',
      description: '30-minute general doctor consultation.',
      shortDescription: 'Doctor appointment',
      price: 25000,
      duration: 30,
      maxCapacity: 1,
      bookingRequired: false,
      appointmentRequired: true,
      deliveryAvailable: false,
      isFeatured: true,
      status: 'ACTIVE',
    },
  });

  const groceryCategory = await prisma.productCategory.upsert({
    where: {
      businessId_slug: {
        businessId: supermarket.id,
        slug: 'groceries',
      },
    },
    update: { isActive: true },
    create: {
      name: 'Groceries',
      nameAr: 'بقالة',
      slug: 'groceries',
      description: 'Everyday grocery items',
      sortOrder: 1,
      isActive: true,
      businessId: supermarket.id,
    },
  });

  await prisma.product.upsert({
    where: { code: 'PRD-BREAD-001' },
    update: { status: 'ACTIVE', isFeatured: true, stockQuantity: 100 },
    create: {
      name: 'Fresh Arabic Bread',
      sku: 'SKU-BREAD-001',
      code: 'PRD-BREAD-001',
      description: 'Fresh baked Arabic bread pack.',
      businessId: supermarket.id,
      branchId: marketBranch.id,
      categoryId: groceryCategory.id,
      images: [],
      basePrice: 2500,
      discountPrice: 2000,
      stockQuantity: 100,
      unlimitedStock: false,
      preparationTime: 10,
      unit: 'PACK',
      tags: ['bread', 'bakery', 'featured'],
      status: 'ACTIVE',
      isFeatured: true,
      isRecommended: true,
    },
  });

  await prisma.product.upsert({
    where: { code: 'PRD-MILK-001' },
    update: { status: 'ACTIVE', isRecommended: true, stockQuantity: 80 },
    create: {
      name: 'Fresh Milk 1L',
      sku: 'SKU-MILK-001',
      code: 'PRD-MILK-001',
      description: 'Fresh full-fat milk 1 liter.',
      businessId: supermarket.id,
      branchId: marketBranch.id,
      categoryId: groceryCategory.id,
      images: [],
      basePrice: 4500,
      stockQuantity: 80,
      unlimitedStock: false,
      preparationTime: 5,
      unit: 'BOTTLE',
      tags: ['dairy', 'milk'],
      status: 'ACTIVE',
      isFeatured: false,
      isRecommended: true,
    },
  });

  await upsertTestDriver(prisma, TEST_ACCOUNTS.driver, damascus, passwordHash, adminUser.id);

  console.log('✅ Demo data seeded successfully');
  console.log('');
  console.log('📋 Test accounts (password for all: CoreSY@123)');
  console.log(`   Admin:    ${TEST_ACCOUNTS.admin.email}`);
  console.log(`   Customer: ${TEST_ACCOUNTS.customer.email}`);
  console.log(`   Business: ${TEST_ACCOUNTS.businessOwner.email}`);
  console.log(`   Driver:   ${TEST_ACCOUNTS.driver.email}`);
}

module.exports = {
  seedDemoData,
  TEST_PASSWORD,
  TEST_ACCOUNTS,
};
