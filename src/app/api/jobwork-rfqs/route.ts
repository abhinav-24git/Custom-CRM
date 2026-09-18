import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const rfqs = await prisma.jobWorkRFQ.findMany({
      include: {
        planning: {
          include: {
            sales_order_item: {
              include: {
                sales_order: { include: { customer: true } },
                item: true
              }
            }
          }
        },
        suppliers: {
          include: { supplier: true }
        },
        quotes: {
          include: { supplier: true }
        },
        ServiceOrders: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(rfqs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Job Work RFQs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { planning_id, process, qty, required_date, material_responsibility, supplier_ids } = json;

    if (!planning_id || !process || !supplier_ids?.length) {
      return NextResponse.json({ error: 'Planning ID, process, and at least one supplier are required' }, { status: 400 });
    }

    const requestedQty = parseFloat(qty);
    if (!requestedQty || requestedQty <= 0) {
      return NextResponse.json({ error: 'Quantity must be > 0' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const planning = await tx.planning.findUnique({
        where: { id: planning_id },
        include: { JobWorkRFQs: true }
      });

      if (!planning) {
        throw new Error('Planning not found');
      }

      if (planning.status === 'Draft' || planning.status === 'Cancelled') {
        throw new Error(`Cannot create Job Work RFQ for Planning in '${planning.status}' status. Release planning first.`);
      }

      if (planning.outsource_qty <= 0) {
        throw new Error('Planning does not have any outsource quantity allocated');
      }

      const count = await tx.jobWorkRFQ.count();
      const rfq_number = `JW-RFQ-${String(count + 1).padStart(4, '0')}`;

      const rfq = await tx.jobWorkRFQ.create({
        data: {
          rfq_number,
          planning_id: planning.id,
          process,
          qty: requestedQty,
          required_date: required_date ? new Date(required_date) : planning.target_end_date,
          material_responsibility: material_responsibility || 'Company',
          status: 'Draft',
          suppliers: {
            create: supplier_ids.map((sid: string) => ({ supplier_id: sid }))
          }
        },
        include: {
          planning: true,
          suppliers: { include: { supplier: true } }
        }
      });

      return rfq;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create Job Work RFQ' }, { status: 400 });
  }
}
