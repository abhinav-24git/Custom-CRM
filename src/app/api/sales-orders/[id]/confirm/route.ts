import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await request.json().catch(() => ({}));

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.is_confirmed) return NextResponse.json({ error: 'Order is already confirmed' }, { status: 400 });
    if (order.lines.length === 0) return NextResponse.json({ error: 'Cannot confirm an order with no lines' }, { status: 400 });

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        is_confirmed: true,
        confirmed_at: new Date(),
        customer_po_number: json.customer_po_number || null,
        delivery_commitment_date: json.delivery_commitment_date ? new Date(json.delivery_commitment_date) : null
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to confirm order' }, { status: 500 });
  }
}
