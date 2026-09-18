import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.salesOrder.findMany({
    include: {
      lines: {
        include: {
          dispatchEntries: true
        }
      }
    }
  });

  for (const o of orders) {
    for (const l of o.lines) {
      const sumDisp = l.dispatchEntries.filter(e => e.type.toUpperCase() === 'DISPATCH').reduce((s, e) => s + e.qty, 0);
      const sumCanc = l.dispatchEntries.filter(e => e.type.toUpperCase() === 'CANCEL').reduce((s, e) => s + e.qty, 0);
      const calcBal = l.ordered_qty - sumDisp - sumCanc;
      if (Math.abs(l.dispatched_qty - sumDisp) > 0.001 || Math.abs(l.cancelled_qty - sumCanc) > 0.001 || Math.abs(l.balance_qty - calcBal) > 0.001) {
        console.log('Mismatch in order:', o.so_number, 'item:', l.id, {
          ordered: l.ordered_qty,
          dispatched_qty: l.dispatched_qty,
          sumDisp,
          cancelled_qty: l.cancelled_qty,
          sumCanc,
          balance_qty: l.balance_qty,
          calcBal,
          entries: l.dispatchEntries
        });
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
