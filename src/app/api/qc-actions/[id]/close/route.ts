import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const action = await prisma.qCAction.findUnique({
      where: { id }
    });

    if (!action) {
      return NextResponse.json({ error: 'QC Action not found' }, { status: 404 });
    }

    const updated = await prisma.qCAction.update({
      where: { id },
      data: { status: 'Closed' }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to close QC action' }, { status: 500 });
  }
}
