import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const mrs = await prisma.materialRequirement.findMany({
      include: {
        sales_order: { include: { customer: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(mrs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Material Requirements' }, { status: 500 });
  }
}
