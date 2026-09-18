import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const so = await prisma.serviceOrder.findUnique({
      where: { id },
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
          include: {
            vendor: true,
            returns: {
              orderBy: { return_date: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!so) {
      return NextResponse.json({ error: 'Service Order not found' }, { status: 404 });
    }

    const totalSent = so.rgpChallans.reduce((sum, rgp) => sum + rgp.sent_qty, 0);
    const remainingToSend = Math.max(0, so.ordered_qty - totalSent);
    const totalReceived = so.rgpChallans.flatMap(rgp => rgp.returns).reduce((sum, ret) => sum + ret.received_qty, 0);
    const totalAccepted = so.rgpChallans.flatMap(rgp => rgp.returns).reduce((sum, ret) => sum + ret.accepted_qty, 0);
    const totalRejected = so.rgpChallans.flatMap(rgp => rgp.returns).reduce((sum, ret) => sum + ret.rejected_qty, 0);
    const totalRework = so.rgpChallans.flatMap(rgp => rgp.returns).reduce((sum, ret) => sum + ret.rework_qty, 0);

    return NextResponse.json({
      ...so,
      total_sent_qty: totalSent,
      remaining_to_send: remainingToSend,
      total_received_qty: totalReceived,
      total_accepted_qty: totalAccepted,
      total_rejected_qty: totalRejected,
      total_rework_qty: totalRework
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Service Order' }, { status: 500 });
  }
}
