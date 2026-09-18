import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({
        where: { id },
        include: { lines: true }
      });

      if (!quotation) throw new Error('Not found');
      if (!quotation.is_latest_revision) throw new Error('Cannot convert an old revision');
      if (quotation.status !== 'Accepted') throw new Error('Quotation must be Accepted to convert');

      // Check if already converted
      const existingSO = await tx.salesOrder.findFirst({
        where: { quotation_id: id }
      });
      if (existingSO) {
        throw new Error(`Already converted to Sales Order: ${existingSO.so_number}`);
      }

      // V1 Logic: Generate SO number
      const count = await tx.salesOrder.count();
      const so_number = `SO-${String(count + 1).padStart(4, '0')}`;

      let total_amount = 0;
      const soLinesToCreate = quotation.lines.map(qLine => {
        // v1 requires rate and ordered_qty > 0.
        const amount = qLine.qty * qLine.rate; // we ignore quotation discount or bake it into rate if we want, but v1 has no discount field.
        // wait, v1 amount = qty * rate. Since quote has discount, we should probably pass the exact amount from quote by adjusting rate?
        // Actually, for simplicity we'll just carry over the exact qty, rate, and ignore discount, OR calculate an effective rate.
        // Let's calculate effective rate: amount / qty
        const effective_rate = qLine.amount / qLine.qty;
        total_amount += qLine.amount;

        return {
          item_id: qLine.item_id,
          ordered_qty: qLine.qty,
          rate: effective_rate,
          amount: qLine.amount,
          balance_qty: qLine.qty, // V1 core logic starting point
          dispatched_qty: 0,
          cancelled_qty: 0
        };
      });

      const order = await tx.salesOrder.create({
        data: {
          so_number,
          quotation_id: quotation.id,
          customer_id: quotation.customer_id,
          order_date: new Date(),
          total_amount,
          status: 'Open',
          lines: {
            create: soLinesToCreate
          }
        }
      });

      return order;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Conversion failed' }, { status: 400 });
  }
}
