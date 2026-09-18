import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const rfqs = await prisma.purchaseRFQ.findMany({
      include: { material_requirement: true, suppliers: { include: { supplier: true } }, items: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(rfqs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch RFQs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { material_requirement_id, mr_line_ids, supplier_ids } = json;

    if (!material_requirement_id || !mr_line_ids?.length || !supplier_ids?.length) {
      return NextResponse.json({ error: 'MR, at least one line, and at least one supplier are required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Validate MR lines have shortage
      const mrItems = await tx.materialRequirementItem.findMany({
        where: { id: { in: mr_line_ids } }
      });
      if (mrItems.some(i => i.shortage_qty <= 0)) {
        throw new Error('Only lines with shortage_qty > 0 can be added to an RFQ');
      }

      const count = await tx.purchaseRFQ.count();
      const rfq_number = `RFQ-${String(count + 1).padStart(4, '0')}`;

      const rfq = await tx.purchaseRFQ.create({
        data: {
          rfq_number,
          material_requirement_id,
          status: 'Draft',
          items: {
            create: mrItems.map(item => ({
              material_requirement_item_id: item.id,
              material_id: item.material_id,
              required_qty: item.shortage_qty, // snapshot shortage at creation
            }))
          },
          suppliers: {
            create: supplier_ids.map((sid: string) => ({ supplier_id: sid }))
          }
        }
      });
      return rfq;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create RFQ' }, { status: 500 });
  }
}
