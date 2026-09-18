import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string, lineId: string }> }) {
  try {
    const { id, lineId } = await params;
    const json = await request.json();
    const qtyToCancel = parseFloat(json.qty);

    if (isNaN(qtyToCancel) || qtyToCancel <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }

    // Run atomically using Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      const lineItem = await tx.salesOrderItem.findUnique({
        where: { id: lineId }
      });

      if (!lineItem) throw new Error('Line item not found');
      if (lineItem.sales_order_id !== id) throw new Error('Line item does not belong to this order');

      if (lineItem.balance_qty < qtyToCancel) {
        throw new Error(`Only ${lineItem.balance_qty} units remaining on this line`);
      }

      // Update Line Item
      const updatedLine = await tx.salesOrderItem.update({
        where: { id: lineId },
        data: {
          cancelled_qty: lineItem.cancelled_qty + qtyToCancel,
          balance_qty: lineItem.balance_qty - qtyToCancel
        }
      });

      // Insert Cancel Entry
      await tx.dispatchEntry.create({
        data: {
          sales_order_item_id: lineId,
          type: 'Cancellation',
          qty: qtyToCancel,
          remarks: json.remarks || null
        }
      });

      // Re-evaluate Order Status
      const allLines = await tx.salesOrderItem.findMany({
        where: { sales_order_id: id }
      });

      let allClosed = true;
      let anyActivity = false;

      for (const line of allLines) {
        if (line.balance_qty > 0) allClosed = false;
        if (line.dispatched_qty > 0 || line.cancelled_qty > 0) anyActivity = true;
      }

      let newStatus = 'Open';
      if (allClosed) newStatus = 'Closed';
      else if (anyActivity) newStatus = 'Partially Dispatched';

      await tx.salesOrder.update({
        where: { id },
        data: { status: newStatus }
      });

      return updatedLine;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Cancellation failed' }, { status: 400 });
  }
}
