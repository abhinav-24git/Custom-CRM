import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const mr = await prisma.materialRequirement.findUnique({
      where: { id },
      include: {
        sales_order: { include: { customer: true } },
        items: { include: { material: true } }
      }
    });
    if (!mr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(mr);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Material Requirement' }, { status: 500 });
  }
}
