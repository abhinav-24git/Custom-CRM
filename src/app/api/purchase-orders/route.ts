import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      include: { supplier: true, lines: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(pos);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Purchase Orders' }, { status: 500 });
  }
}
