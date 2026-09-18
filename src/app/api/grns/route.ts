import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { purchase_order_id, grn_date, supplier_challan_ref, lines } = json;

    if (!purchase_order_id || !lines?.length) {
      return NextResponse.json({ error: 'purchase_order_id and lines are required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: purchase_order_id },
        include: { lines: true }
      });
      if (!po) throw new Error('Purchase Order not found');

      const poLineMap = Object.fromEntries(po.lines.map(l => [l.id, l]));

      // Validate all lines
      for (const line of lines) {
        const poLine = poLineMap[line.purchase_order_item_id];
        if (!poLine) throw new Error(`PO line ${line.purchase_order_item_id} not found`);

        const received = parseFloat(line.received_qty);
        const accepted = parseFloat(line.accepted_qty);
        const rejected = parseFloat(line.rejected_qty);

        if (received <= 0) throw new Error('Received qty must be > 0');
        if (accepted < 0 || rejected < 0) throw new Error('Accepted and rejected qty must be >= 0');
        if (Math.abs((accepted + rejected) - received) > 0.0001) {
          throw new Error(`Accepted (${accepted}) + Rejected (${rejected}) must equal Received (${received}) for material line`);
        }
        if (poLine.received_qty + received > poLine.ordered_qty + 0.0001) {
          throw new Error(`Cannot receive more than ordered. Ordered: ${poLine.ordered_qty}, Already received: ${poLine.received_qty}, Attempting: ${received}`);
        }
      }

      // Create GRN
      const count = await tx.gRN.count();
      const grn_number = `GRN-${String(count + 1).padStart(4, '0')}`;

      const grn = await tx.gRN.create({
        data: {
          grn_number,
          purchase_order_id,
          grn_date: grn_date ? new Date(grn_date) : new Date(),
          supplier_challan_ref: supplier_challan_ref || null,
          items: {
            create: lines.map((line: any) => ({
              purchase_order_item_id: line.purchase_order_item_id,
              received_qty: parseFloat(line.received_qty),
              accepted_qty: parseFloat(line.accepted_qty),
              rejected_qty: parseFloat(line.rejected_qty),
              remarks: line.remarks || null,
            }))
          }
        }
      });

      // Update PO lines received_qty and materials available_stock
      for (const line of lines) {
        const poLine = poLineMap[line.purchase_order_item_id];
        const newReceived = poLine.received_qty + parseFloat(line.received_qty);
        const newPending = poLine.ordered_qty - newReceived;

        await tx.purchaseOrderItem.update({
          where: { id: line.purchase_order_item_id },
          data: { received_qty: newReceived, pending_qty: newPending }
        });

        // Increment available_stock by ACCEPTED qty only
        await tx.material.update({
          where: { id: poLine.material_id },
          data: { available_stock: { increment: parseFloat(line.accepted_qty) } }
        });
      }

      // Recompute PO status
      const updatedLines = await tx.purchaseOrderItem.findMany({ where: { purchase_order_id } });
      let newStatus = 'Closed';
      const anyReceived = updatedLines.some(l => l.received_qty > 0);
      const anyPending = updatedLines.some(l => l.pending_qty > 0.0001);
      if (anyPending && anyReceived) newStatus = 'Partially Received';
      else if (anyPending && !anyReceived) newStatus = 'Issued';

      await tx.purchaseOrder.update({ where: { id: purchase_order_id }, data: { status: newStatus } });

      return grn;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create GRN' }, { status: 400 });
  }
}
