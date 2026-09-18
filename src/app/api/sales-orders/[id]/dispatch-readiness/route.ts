import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const so = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: {
          include: {
            item: true,
            QCInspections: {
              where: { status: 'Completed' },
              include: { items: true }
            }
          }
        }
      }
    });

    if (!so) {
      return NextResponse.json({ error: 'Sales Order not found' }, { status: 404 });
    }

    const linesReadiness = so.lines.map((line) => {
      const qcAcceptedQty = line.QCInspections.reduce((total, qc) => {
        const itemSum = qc.items.reduce((s, itm) => s + itm.accepted_qty, 0);
        return total + itemSum;
      }, 0);

      const availableToDispatch = Math.max(0, qcAcceptedQty - line.dispatched_qty);

      return {
        sales_order_item_id: line.id,
        item_id: line.item_id,
        item_name: line.item.name,
        uom: line.item.uom,
        ordered_qty: line.ordered_qty,
        rate: line.rate,
        amount: line.amount,
        dispatched_qty: line.dispatched_qty,
        cancelled_qty: line.cancelled_qty,
        balance_qty: line.balance_qty,
        qc_accepted_qty: qcAcceptedQty,
        available_to_dispatch: availableToDispatch
      };
    });

    const totalAvailableToDispatch = linesReadiness.reduce((sum, l) => sum + l.available_to_dispatch, 0);

    return NextResponse.json({
      sales_order_id: so.id,
      so_number: so.so_number,
      customer_name: so.customer.name,
      is_confirmed: so.is_confirmed,
      total_available_to_dispatch: totalAvailableToDispatch,
      lines: linesReadiness
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate dispatch readiness' }, { status: 500 });
  }
}
