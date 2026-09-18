import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dispatch = await prisma.dispatch.findUnique({
      where: { id },
      include: {
        sales_order: {
          include: {
            customer: true
          }
        },
        items: {
          include: {
            sales_order_item: {
              include: {
                item: true
              }
            }
          }
        }
      }
    });

    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    const totalQty = dispatch.items.reduce((s, i) => s + i.dispatched_qty, 0);

    return NextResponse.json({
      ...dispatch,
      total_qty: totalQty
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dispatch details' }, { status: 500 });
  }
}
