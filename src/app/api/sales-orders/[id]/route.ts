import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: {
          include: {
            item: true
          }
        }
      }
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales order' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await request.json();
    
    // Simplification for MVP: We only allow updating the customer_id or order_date for header.
    // Line items editing involves checking if dispatched_qty + cancelled_qty > 0.
    
    // For MVP, let's keep it simple: just update header if needed, or reject if lines are touched and locked.
    // Given the complexity of partial updates in Prisma, we'll leave full line editing for a robust transaction.
    // I will implement a basic header update here, as editing lines is tricky without a dedicated endpoint.
    
    const updateData: any = {};
    if (json.customer_id) updateData.customer_id = json.customer_id;
    if (json.order_date) updateData.order_date = new Date(json.order_date);

    const order = await prisma.salesOrder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update sales order' }, { status: 500 });
  }
}
