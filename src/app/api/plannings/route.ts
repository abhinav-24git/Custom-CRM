import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const plannings = await prisma.planning.findMany({
      include: {
        sales_order_item: {
          include: {
            sales_order: {
              include: { customer: true }
            },
            item: true
          }
        },
        JobCards: {
          include: { productionEntries: true }
        },
        JobWorkRFQs: {
          include: { ServiceOrders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(plannings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch plannings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { sales_order_item_id, inhouse_qty, outsource_qty, target_start_date, target_end_date, notes } = json;

    if (!sales_order_item_id) {
      return NextResponse.json({ error: 'Sales order item is required' }, { status: 400 });
    }

    const inQty = parseFloat(inhouse_qty) || 0;
    const outQty = parseFloat(outsource_qty) || 0;
    const totalPlanned = inQty + outQty;

    if (inQty < 0 || outQty < 0 || totalPlanned <= 0) {
      return NextResponse.json({ error: 'In-house and outsource quantities must be non-negative, and total planned qty must be > 0' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const soItem = await tx.salesOrderItem.findUnique({
        where: { id: sales_order_item_id },
        include: { sales_order: true, Plannings: true }
      });

      if (!soItem) {
        throw new Error('Sales order item not found');
      }

      if (!soItem.sales_order.is_confirmed) {
        throw new Error('Planning can only be created for confirmed Sales Orders');
      }

      // Check cumulative allocation cap across active plannings
      const existingPlannings = soItem.Plannings.filter(p => p.status !== 'Cancelled');
      const alreadyPlanned = existingPlannings.reduce((sum, p) => sum + p.inhouse_qty + p.outsource_qty, 0);

      if (alreadyPlanned + totalPlanned > soItem.ordered_qty + 0.0001) {
        throw new Error(
          `Cannot allocate more than ordered quantity (${soItem.ordered_qty}). Already planned: ${alreadyPlanned}, Attempting: ${totalPlanned}, Available to plan: ${Math.max(0, soItem.ordered_qty - alreadyPlanned)}`
        );
      }

      const count = await tx.planning.count();
      const planning_number = `PLN-${String(count + 1).padStart(4, '0')}`;

      const planning = await tx.planning.create({
        data: {
          planning_number,
          sales_order_item_id,
          inhouse_qty: inQty,
          outsource_qty: outQty,
          target_start_date: target_start_date ? new Date(target_start_date) : null,
          target_end_date: target_end_date ? new Date(target_end_date) : null,
          notes: notes || null,
          status: 'Draft'
        },
        include: {
          sales_order_item: {
            include: {
              sales_order: { include: { customer: true } },
              item: true
            }
          }
        }
      });

      return planning;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create planning' }, { status: 400 });
  }
}
