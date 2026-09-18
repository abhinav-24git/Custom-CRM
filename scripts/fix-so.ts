import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function fix() {
  await p.salesOrderItem.update({
    where: { id: '4fb8211f-e7b0-4f22-b4a1-751f9876f9c8' },
    data: { dispatched_qty: 30, balance_qty: 50 }
  });
  console.log('Fixed item balance reconciliation.');
}

fix().finally(() => p.$disconnect());
