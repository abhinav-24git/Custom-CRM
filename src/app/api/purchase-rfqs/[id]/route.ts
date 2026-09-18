import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rfq = await prisma.purchaseRFQ.findUnique({
      where: { id },
      include: {
        material_requirement: true,
        items: { include: { material: true, SupplierQuoteItems: { include: { supplier_quote: { include: { supplier: true } } } } } },
        suppliers: { include: { supplier: true } },
        SupplierQuotes: { include: { supplier: true, items: { include: { purchase_rfq_item: true } } } },
        PurchaseOrders: true,
      }
    });
    if (!rfq) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rfq);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch RFQ' }, { status: 500 });
  }
}
