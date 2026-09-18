import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const enquiry = await tx.enquiry.findUnique({
        where: { id },
        include: { items: { include: { item: true } } }
      });

      if (!enquiry) throw new Error('Enquiry not found');

      const count = await tx.quotation.count();
      const quotation_number = `Q-${String(count + 1).padStart(4, '0')}`;

      let total_amount = 0;
      const qItemsToCreate = enquiry.items.map(enqItem => {
        const rate = enqItem.item.default_rate || 0;
        const amount = enqItem.requested_qty * rate;
        total_amount += amount;
        return {
          item_id: enqItem.item_id,
          qty: enqItem.requested_qty,
          rate: rate,
          discount: 0,
          amount: amount
        };
      });

      const quotation = await tx.quotation.create({
        data: {
          quotation_number,
          revision_number: 0,
          enquiry_id: id,
          customer_id: enquiry.customer_id,
          status: 'Draft',
          total_amount,
          is_latest_revision: true,
          lines: {
            create: qItemsToCreate
          }
        }
      });

      // Update enquiry status
      await tx.enquiry.update({
        where: { id },
        data: { status: 'Quotation Created' }
      });

      return quotation;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create quotation' }, { status: 500 });
  }
}
