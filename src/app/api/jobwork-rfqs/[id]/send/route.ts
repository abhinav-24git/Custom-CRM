import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rfq = await prisma.jobWorkRFQ.findUnique({
      where: { id },
      include: { suppliers: true }
    });

    if (!rfq) {
      return NextResponse.json({ error: 'Job Work RFQ not found' }, { status: 404 });
    }

    if (rfq.status !== 'Draft') {
      return NextResponse.json({ error: `Only Draft RFQs can be marked as Sent (current: ${rfq.status})` }, { status: 400 });
    }

    if (!rfq.suppliers.length) {
      return NextResponse.json({ error: 'Cannot send an RFQ with no suppliers added' }, { status: 400 });
    }

    const updated = await prisma.jobWorkRFQ.update({
      where: { id },
      data: { status: 'Sent' }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send RFQ' }, { status: 500 });
  }
}
