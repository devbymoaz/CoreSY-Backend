/**
 * Prisma seed file for CoreSY backend
 * Seeds default roles, permissions, and other initial data
 */

const { PrismaClient } = require('@prisma/client');
const {
  ROLES,
  ROLE_PRIORITIES,
  PERMISSION_MODULES,
} = require('../src/constants');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // ------------------------------
  // 1. Create Permissions
  // ------------------------------
  console.log('📦 Creating permissions...');

  const permissions = [];

  // Helper to create a permission
  const createPermission = (module, name, slug, description) => {
    permissions.push({
      module,
      name,
      slug,
      description,
    });
  };

  // Users module
  createPermission(PERMISSION_MODULES.USERS, 'Create User', 'users.create', 'Create new users');
  createPermission(PERMISSION_MODULES.USERS, 'Read User', 'users.read', 'View user details');
  createPermission(PERMISSION_MODULES.USERS, 'Update User', 'users.update', 'Update user information');
  createPermission(PERMISSION_MODULES.USERS, 'Delete User', 'users.delete', 'Delete users');

  // Roles module
  createPermission(PERMISSION_MODULES.ROLES, 'Create Role', 'roles.create', 'Create new roles');
  createPermission(PERMISSION_MODULES.ROLES, 'Read Role', 'roles.read', 'View role details');
  createPermission(PERMISSION_MODULES.ROLES, 'Update Role', 'roles.update', 'Update role information');
  createPermission(PERMISSION_MODULES.ROLES, 'Delete Role', 'roles.delete', 'Delete roles');

  // Permissions module
  createPermission(PERMISSION_MODULES.PERMISSIONS, 'Create Permission', 'permissions.create', 'Create new permissions');
  createPermission(PERMISSION_MODULES.PERMISSIONS, 'Read Permission', 'permissions.read', 'View permission details');
  createPermission(PERMISSION_MODULES.PERMISSIONS, 'Update Permission', 'permissions.update', 'Update permission information');
  createPermission(PERMISSION_MODULES.PERMISSIONS, 'Delete Permission', 'permissions.delete', 'Delete permissions');

  // Businesses module
  createPermission(PERMISSION_MODULES.BUSINESSES, 'Create Business', 'business.create', 'Create new businesses');
  createPermission(PERMISSION_MODULES.BUSINESSES, 'Read Business', 'business.read', 'View business details');
  createPermission(PERMISSION_MODULES.BUSINESSES, 'Update Business', 'business.update', 'Update business information');
  createPermission(PERMISSION_MODULES.BUSINESSES, 'Delete Business', 'business.delete', 'Delete businesses');

  // Branches module
  createPermission(PERMISSION_MODULES.BRANCHES, 'Create Branch', 'branches.create', 'Create new branches');
  createPermission(PERMISSION_MODULES.BRANCHES, 'Read Branch', 'branches.read', 'View branch details');
  createPermission(PERMISSION_MODULES.BRANCHES, 'Update Branch', 'branches.update', 'Update branch information');
  createPermission(PERMISSION_MODULES.BRANCHES, 'Delete Branch', 'branches.delete', 'Delete branches');

  // Services module
  createPermission(PERMISSION_MODULES.SERVICES, 'Create Service', 'services.create', 'Create new services');
  createPermission(PERMISSION_MODULES.SERVICES, 'Read Service', 'services.read', 'View service details');
  createPermission(PERMISSION_MODULES.SERVICES, 'Update Service', 'services.update', 'Update service information');
  createPermission(PERMISSION_MODULES.SERVICES, 'Delete Service', 'services.delete', 'Delete services');

  // Bookings module
  createPermission(PERMISSION_MODULES.BOOKINGS, 'Create Booking', 'booking.create', 'Create new bookings');
  createPermission(PERMISSION_MODULES.BOOKINGS, 'Read Booking', 'booking.read', 'View booking details');
  createPermission(PERMISSION_MODULES.BOOKINGS, 'Update Booking', 'booking.update', 'Update booking information');
  createPermission(PERMISSION_MODULES.BOOKINGS, 'Cancel Booking', 'booking.cancel', 'Cancel bookings');

  // Drivers module
  createPermission(PERMISSION_MODULES.DRIVERS, 'Create Driver', 'driver.create', 'Create new drivers');
  createPermission(PERMISSION_MODULES.DRIVERS, 'Read Driver', 'driver.read', 'View driver details');
  createPermission(PERMISSION_MODULES.DRIVERS, 'Update Driver', 'driver.update', 'Update driver information');
  createPermission(PERMISSION_MODULES.DRIVERS, 'Assign Driver', 'driver.assign', 'Assign drivers to orders');

  // Cashiers module
  createPermission(PERMISSION_MODULES.CASHIERS, 'Create Cashier', 'cashier.create', 'Create new cashiers');
  createPermission(PERMISSION_MODULES.CASHIERS, 'Read Cashier', 'cashier.read', 'View cashier details');
  createPermission(PERMISSION_MODULES.CASHIERS, 'Update Cashier', 'cashier.update', 'Update cashier information');
  createPermission(PERMISSION_MODULES.CASHIERS, 'Delete Cashier', 'cashier.delete', 'Delete cashiers');

  // Wallet module
  createPermission(PERMISSION_MODULES.WALLET, 'Read Wallet', 'wallet.read', 'View wallet details');
  createPermission(PERMISSION_MODULES.WALLET, 'Update Wallet', 'wallet.update', 'Update wallet information');

  // Payments module
  createPermission(PERMISSION_MODULES.PAYMENTS, 'Create Payment', 'payments.create', 'Create new payments');
  createPermission(PERMISSION_MODULES.PAYMENTS, 'Read Payment', 'payments.read', 'View payment details');
  createPermission(PERMISSION_MODULES.PAYMENTS, 'Update Payment', 'payments.update', 'Update payment information');

  // Subscriptions module
  createPermission(PERMISSION_MODULES.SUBSCRIPTIONS, 'Create Subscription', 'subscriptions.create', 'Create new subscriptions');
  createPermission(PERMISSION_MODULES.SUBSCRIPTIONS, 'Read Subscription', 'subscriptions.read', 'View subscription details');
  createPermission(PERMISSION_MODULES.SUBSCRIPTIONS, 'Update Subscription', 'subscriptions.update', 'Update subscription information');
  createPermission(PERMISSION_MODULES.SUBSCRIPTIONS, 'Delete Subscription', 'subscriptions.delete', 'Delete subscriptions');

  // Notifications module
  createPermission(PERMISSION_MODULES.NOTIFICATIONS, 'Send Notification', 'notification.send', 'Send notifications');
  createPermission(PERMISSION_MODULES.NOTIFICATIONS, 'Read Notification', 'notification.read', 'View notification details');

  // Reports module
  createPermission(PERMISSION_MODULES.REPORTS, 'Read Reports', 'reports.read', 'View reports');

  // Analytics module
  createPermission(PERMISSION_MODULES.ANALYTICS, 'Read Analytics', 'analytics.read', 'View analytics');

  // Settings module
  createPermission(PERMISSION_MODULES.SETTINGS, 'Read Settings', 'settings.read', 'View system settings');
  createPermission(PERMISSION_MODULES.SETTINGS, 'Update Settings', 'settings.update', 'Update system settings');

  // Content module
  createPermission(PERMISSION_MODULES.CONTENT, 'Create Content', 'content.create', 'Create new content');
  createPermission(PERMISSION_MODULES.CONTENT, 'Read Content', 'content.read', 'View content details');
  createPermission(PERMISSION_MODULES.CONTENT, 'Update Content', 'content.update', 'Update content information');
  createPermission(PERMISSION_MODULES.CONTENT, 'Delete Content', 'content.delete', 'Delete content');

  // Support module
  createPermission(PERMISSION_MODULES.SUPPORT, 'Read Support', 'support.read', 'View support tickets');
  createPermission(PERMISSION_MODULES.SUPPORT, 'Update Support', 'support.update', 'Update support tickets');

  // Finance module
  createPermission(PERMISSION_MODULES.FINANCE, 'Read Finance', 'finance.read', 'View financial data');
  createPermission(PERMISSION_MODULES.FINANCE, 'Update Finance', 'finance.update', 'Update financial data');
  createPermission(PERMISSION_MODULES.FINANCE, 'Approve Finance', 'finance.approve', 'Approve financial transactions');

  // Points module
  createPermission(PERMISSION_MODULES.POINTS, 'Read Points', 'points.read', 'View points balance');
  createPermission(PERMISSION_MODULES.POINTS, 'Update Points', 'points.update', 'Update points balance');

  // QR module
  createPermission(PERMISSION_MODULES.QR, 'Create QR', 'qr.create', 'Generate QR codes');
  createPermission(PERMISSION_MODULES.QR, 'Read QR', 'qr.read', 'View QR codes');
  createPermission(PERMISSION_MODULES.QR, 'Scan QR', 'qr.scan', 'Scan QR codes');

  // Insert permissions
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: {},
      create: perm,
    });
  }
  console.log(`✅ Created ${permissions.length} permissions`);

  // ------------------------------
  // 2. Create Roles
  // ------------------------------
  console.log('👥 Creating roles...');

  const roles = [
    {
      name: ROLES.SUPER_ADMIN,
      displayName: 'Super Admin',
      description: 'Full access to all system features',
      priority: ROLE_PRIORITIES.SUPER_ADMIN,
      isSystem: true,
    },
    {
      name: ROLES.FINANCE_ADMIN,
      displayName: 'Finance Admin',
      description: 'Access to financial and payment features',
      priority: ROLE_PRIORITIES.FINANCE_ADMIN,
      isSystem: true,
    },
    {
      name: ROLES.SUPPORT_ADMIN,
      displayName: 'Support Admin',
      description: 'Access to support and user management',
      priority: ROLE_PRIORITIES.SUPPORT_ADMIN,
      isSystem: true,
    },
    {
      name: ROLES.BUSINESS_OWNER,
      displayName: 'Business Owner',
      description: 'Full access to business features',
      priority: ROLE_PRIORITIES.BUSINESS_OWNER,
      isSystem: true,
    },
    {
      name: ROLES.BUSINESS_MANAGER,
      displayName: 'Business Manager',
      description: 'Manage business operations',
      priority: ROLE_PRIORITIES.BUSINESS_MANAGER,
      isSystem: true,
    },
    {
      name: ROLES.CASHIER,
      displayName: 'Cashier',
      description: 'Handle cashier operations',
      priority: ROLE_PRIORITIES.CASHIER,
      isSystem: true,
    },
    {
      name: ROLES.DRIVER,
      displayName: 'Driver',
      description: 'Handle deliveries',
      priority: ROLE_PRIORITIES.DRIVER,
      isSystem: true,
    },
    {
      name: ROLES.USER,
      displayName: 'User',
      description: 'Standard user role',
      priority: ROLE_PRIORITIES.USER,
      isSystem: true,
    },
  ];

  const createdRoles = [];
  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    createdRoles.push(createdRole);
  }
  console.log(`✅ Created ${roles.length} roles`);

  // ------------------------------
  // 3. Assign Permissions to Roles
  // ------------------------------
  console.log('🔗 Assigning permissions to roles...');

  const allPermissionSlugs = permissions.map(p => p.slug);

  // SUPER_ADMIN gets all permissions
  await assignPermissionsToRole(ROLES.SUPER_ADMIN, allPermissionSlugs);

  // FINANCE_ADMIN gets finance and payments permissions
  const financePermissionSlugs = allPermissionSlugs.filter(slug =>
    slug.startsWith('finance.') ||
    slug.startsWith('payments.') ||
    slug.startsWith('wallet.') ||
    slug.startsWith('reports.') ||
    slug.startsWith('analytics.') ||
    slug.startsWith('users.read')
  );
  await assignPermissionsToRole(ROLES.FINANCE_ADMIN, financePermissionSlugs);

  // SUPPORT_ADMIN gets support and user permissions
  const supportPermissionSlugs = allPermissionSlugs.filter(slug =>
    slug.startsWith('users.') ||
    slug.startsWith('support.') ||
    slug.startsWith('notifications.')
  );
  await assignPermissionsToRole(ROLES.SUPPORT_ADMIN, supportPermissionSlugs);

  // BUSINESS_OWNER gets business, branch, service, booking, cashier permissions
  const businessOwnerPermissionSlugs = allPermissionSlugs.filter(slug =>
    slug.startsWith('business.') ||
    slug.startsWith('branches.') ||
    slug.startsWith('services.') ||
    slug.startsWith('booking.') ||
    slug.startsWith('cashier.') ||
    slug.startsWith('driver.') ||
    slug.startsWith('wallet.read') ||
    slug.startsWith('reports.read') ||
    slug.startsWith('analytics.read') ||
    slug.startsWith('users.read')
  );
  await assignPermissionsToRole(ROLES.BUSINESS_OWNER, businessOwnerPermissionSlugs);

  // BUSINESS_MANAGER gets branch, service, booking permissions
  const businessManagerPermissionSlugs = allPermissionSlugs.filter(slug =>
    slug.startsWith('branches.read') ||
    slug.startsWith('branches.update') ||
    slug.startsWith('services.') ||
    slug.startsWith('booking.') ||
    slug.startsWith('cashier.read') ||
    slug.startsWith('driver.read')
  );
  await assignPermissionsToRole(ROLES.BUSINESS_MANAGER, businessManagerPermissionSlugs);

  // CASHIER gets limited booking, payment, and cashier permissions
  const cashierPermissionSlugs = allPermissionSlugs.filter(slug =>
    slug.startsWith('booking.create') ||
    slug.startsWith('booking.read') ||
    slug.startsWith('booking.update') ||
    slug.startsWith('payments.create') ||
    slug.startsWith('payments.read')
  );
  await assignPermissionsToRole(ROLES.CASHIER, cashierPermissionSlugs);

  // DRIVER gets driver and delivery permissions
  const driverPermissionSlugs = allPermissionSlugs.filter(slug =>
    slug.startsWith('driver.read') ||
    slug.startsWith('driver.update') ||
    slug.startsWith('booking.read')
  );
  await assignPermissionsToRole(ROLES.DRIVER, driverPermissionSlugs);

  // USER gets basic user permissions
  const userPermissionSlugs = allPermissionSlugs.filter(slug =>
    slug.startsWith('users.read')
  );
  await assignPermissionsToRole(ROLES.USER, userPermissionSlugs);

  console.log('✅ Permissions assigned successfully');

  // ------------------------------
  // 4. Seed Governorates if needed
  // ------------------------------
  console.log('🏛️ Checking governorates...');

  const existingGovernorates = await prisma.governorate.count();
  if (existingGovernorates === 0) {
    const governorates = [
      { name: 'Damascus', nameAr: 'دمشق', code: 'DM' },
      { name: 'Aleppo', nameAr: 'حلب', code: 'AL' },
      { name: 'Homs', nameAr: 'حمص', code: 'HO' },
      { name: 'Hama', nameAr: 'حماة', code: 'HA' },
      { name: 'Latakia', nameAr: 'اللاذقية', code: 'LA' },
      { name: 'Tartus', nameAr: 'طرطوس', code: 'TA' },
      { name: 'Idlib', nameAr: 'إدلب', code: 'ID' },
      { name: 'Deir ez-Zor', nameAr: 'دير الزور', code: 'DZ' },
      { name: 'Raqqa', nameAr: 'الرقة', code: 'RQ' },
      { name: 'Hasakah', nameAr: 'الحسكة', code: 'HK' },
      { name: 'Daraa', nameAr: 'درعا', code: 'DR' },
      { name: 'Quneitra', nameAr: 'القنيطرة', code: 'QU' },
      { name: 'Suwayda', nameAr: 'السويداء', code: 'SW' },
      { name: 'Damascus Countryside', nameAr: 'ريف دمشق', code: 'RD' },
    ];

    for (const gov of governorates) {
      await prisma.governorate.create({
        data: gov,
      });
    }
    console.log(`✅ Created ${governorates.length} governorates`);
  } else {
    console.log('ℹ️ Governorates already exist');
  }

  console.log('🎉 Seeding completed successfully!');
}

async function assignPermissionsToRole(roleName, permissionSlugs) {
  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role) {
    console.log(`⚠️ Role ${roleName} not found, skipping`);
    return;
  }

  const permissions = await prisma.permission.findMany({
    where: { slug: { in: permissionSlugs } },
  });

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
