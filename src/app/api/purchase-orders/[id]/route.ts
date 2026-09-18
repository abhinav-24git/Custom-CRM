import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchase_rfq: true,
        lines: { include: { material: true } },
        GRNs: { include: { items: { include: { purchase_order_item: { include: { material: true } } } } } }
      }
    });
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(po);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch PO' }, { status: 500 });
  }
}
