import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rfq = await prisma.jobWorkRFQ.findUnique({
      where: { id },
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
          include: { supplier: true },
          orderBy: { rate: 'asc' }
        },
        ServiceOrders: {
          include: {
            supplier: true,
            rgpChallans: {
              include: { returns: true }
            }
          }
        }
      }
    });

    if (!rfq) {
      return NextResponse.json({ error: 'Job Work RFQ not found' }, { status: 404 });
    }

    return NextResponse.json(rfq);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Job Work RFQ' }, { status: 500 });
  }
}
