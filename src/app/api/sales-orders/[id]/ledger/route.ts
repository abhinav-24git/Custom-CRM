import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ledger = await prisma.dispatchEntry.findMany({
      where: {
        sales_order_item: {
          sales_order_id: id
        }
      },
      include: {
        sales_order_item: {
          include: { item: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(ledger);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 });
  }
}
