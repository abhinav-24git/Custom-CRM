import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const { sent_qty, challan_date, expected_return_date } = json;

    const qtyToSend = parseFloat(sent_qty);
    if (!qtyToSend || qtyToSend <= 0) {
      return NextResponse.json({ error: 'Sent quantity must be > 0' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const so = await tx.serviceOrder.findUnique({
        where: { id },
        include: { rgpChallans: true }
      });

      if (!so) {
        throw new Error('Service Order not found');
      }

      if (so.status === 'Closed' || so.status === 'Cancelled') {
        throw new Error(`Cannot issue RGP for a Service Order in '${so.status}' status`);
      }

      const alreadySent = so.rgpChallans.reduce((sum, rgp) => sum + rgp.sent_qty, 0);
      const remaining = so.ordered_qty - alreadySent;

      if (alreadySent + qtyToSend > so.ordered_qty + 0.0001) {
        throw new Error(
          `Cannot send more than Service Order ordered quantity (${so.ordered_qty}). Already sent: ${alreadySent}, Attempting to send: ${qtyToSend}, Remaining un-sent: ${Math.max(0, remaining)}`
        );
      }

      const count = await tx.rGPChallan.count();
      const rgp_number = `RGP-${String(count + 1).padStart(4, '0')}`;

      const rgp = await tx.rGPChallan.create({
        data: {
          rgp_number,
          service_order_id: so.id,
          vendor_id: so.supplier_id,
          sent_qty: qtyToSend,
          challan_date: challan_date ? new Date(challan_date) : new Date(),
          expected_return_date: expected_return_date ? new Date(expected_return_date) : null,
          status: 'Dispatched'
        },
        include: {
          vendor: true,
          service_order: true
        }
      });

      // Update Service Order status to 'In Progress' if currently 'Issued'
      if (so.status === 'Issued') {
        await tx.serviceOrder.update({
          where: { id: so.id },
          data: { status: 'In Progress' }
        });
      }

      return rgp;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to issue RGP Challan' }, { status: 400 });
  }
}
