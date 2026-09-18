import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rgp = await prisma.rGPChallan.findUnique({
      where: { id },
      include: {
        vendor: true,
        service_order: {
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
            }
          }
        },
        returns: {
          orderBy: { return_date: 'desc' }
        }
      }
    });

    if (!rgp) {
      return NextResponse.json({ error: 'RGP Challan not found' }, { status: 404 });
    }

    const totalReturned = rgp.returns.reduce((sum, r) => sum + r.received_qty, 0);
    const totalAccepted = rgp.returns.reduce((sum, r) => sum + r.accepted_qty, 0);
    const totalRejected = rgp.returns.reduce((sum, r) => sum + r.rejected_qty, 0);
    const totalRework = rgp.returns.reduce((sum, r) => sum + r.rework_qty, 0);
    const pendingReturn = Math.max(0, rgp.sent_qty - totalReturned);

    const now = new Date().getTime();
    const challanTime = new Date(rgp.challan_date).getTime();
    const daysOutstanding = Math.max(0, Math.floor((now - challanTime) / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      ...rgp,
      total_returned_qty: totalReturned,
      total_accepted_qty: totalAccepted,
      total_rejected_qty: totalRejected,
      total_rework_qty: totalRework,
      pending_return_qty: pendingReturn,
      days_outstanding: daysOutstanding
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch RGP Challan' }, { status: 500 });
  }
}
