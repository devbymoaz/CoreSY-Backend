/**
 * One-off: credit wallets that have zero/low balance (dev/demo seed).
 * Usage on server: node scripts/credit-wallets.js [amount]
 */
const { prisma } = require('../src/prisma');

async function main() {
  const amount = Number(process.argv[2] || 10000);
  const wallets = await prisma.wallet.findMany({
    where: { deletedAt: null, availableBalance: { lte: 0 } },
    include: { customer: { select: { email: true, fullName: true } } },
  });

  // Also ensure every active user has a wallet
  const users = await prisma.user.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    select: { id: true, email: true, fullName: true, wallet: true },
  });

  let created = 0;
  let credited = 0;

  for (const user of users) {
    let wallet = user.wallet;
    if (!wallet) {
      const count = await prisma.wallet.count();
      wallet = await prisma.wallet.create({
        data: {
          walletId: `WLT-${String(count + 1).padStart(8, '0')}`,
          customerId: user.id,
          currentBalance: 0,
          availableBalance: 0,
          blockedBalance: 0,
          currency: 'SYP',
        },
      });
      created += 1;
    }

    if (Number(wallet.availableBalance) <= 0) {
      const before = Number(wallet.availableBalance);
      const after = before + amount;
      await prisma.$transaction([
        prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: after,
            currentBalance: after + Number(wallet.blockedBalance || 0),
          },
        }),
        prisma.walletTransaction.create({
          data: {
            transactionId: `TXN-SEED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            walletId: wallet.id,
            referenceNumber: `REF-SEED-${Date.now()}`,
            type: 'ADMIN_ADJUSTMENT',
            amount,
            balanceBefore: before,
            balanceAfter: after,
            description: 'CREDIT: Demo/seed balance for testing',
            status: 'COMPLETED',
          },
        }),
      ]);
      credited += 1;
      console.log(`Credited ${amount} SYP → ${user.email || user.id}`);
    }
  }

  console.log(JSON.stringify({ users: users.length, walletsCreated: created, walletsCredited: credited, amount }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
