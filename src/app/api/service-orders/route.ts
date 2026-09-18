import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const serviceOrders = await prisma.serviceOrder.findMany({
      include: {
        supplier: true,
        jobwork_rfq: {
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
            }
          }
        },
        rgpChallans: {
          include: { returns: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const ordersWithStats = serviceOrders.map(so => {
      const totalSent = so.rgpChallans.reduce((sum, rgp) => sum + rgp.sent_qty, 0);
      const remainingToSend = Math.max(0, so.ordered_qty - totalSent);
      const totalReceived = so.rgpChallans.flatMap(rgp => rgp.returns).reduce((sum, ret) => sum + ret.received_qty, 0);
      const totalAccepted = so.rgpChallans.flatMap(rgp => rgp.returns).reduce((sum, ret) => sum + ret.accepted_qty, 0);
      const totalRejected = so.rgpChallans.flatMap(rgp => rgp.returns).reduce((sum, ret) => sum + ret.rejected_qty, 0);
      const totalRework = so.rgpChallans.flatMap(rgp => rgp.returns).reduce((sum, ret) => sum + ret.rework_qty, 0);

      return {
        ...so,
        total_sent_qty: totalSent,
        remaining_to_send: remainingToSend,
        total_received_qty: totalReceived,
        total_accepted_qty: totalAccepted,
        total_rejected_qty: totalRejected,
        total_rework_qty: totalRework
      };
    });

    return NextResponse.json(ordersWithStats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Service Orders' }, { status: 500 });
  }
}
