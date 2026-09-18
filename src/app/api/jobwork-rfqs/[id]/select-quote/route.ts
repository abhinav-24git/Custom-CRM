import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const { quote_id } = json;

    if (!quote_id) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const rfq = await tx.jobWorkRFQ.findUnique({
        where: { id },
        include: { quotes: true }
      });

      if (!rfq) {
        throw new Error('Job Work RFQ not found');
      }

      if (rfq.status === 'Closed') {
        throw new Error('Cannot select quote on a Closed RFQ');
      }

      const quote = rfq.quotes.find(q => q.id === quote_id);
      if (!quote) {
        throw new Error('Selected quote does not belong to this RFQ');
      }

      // Unselect all other quotes for this RFQ
      await tx.jobWorkQuote.updateMany({
        where: { jobwork_rfq_id: rfq.id },
        data: { is_selected: false }
      });

      // Select this quote
      const updatedQuote = await tx.jobWorkQuote.update({
        where: { id: quote_id },
        data: { is_selected: true }
      });

      // Update RFQ status to 'Compared'
      await tx.jobWorkRFQ.update({
        where: { id: rfq.id },
        data: { status: 'Compared' }
      });

      return updatedQuote;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to select quote' }, { status: 400 });
  }
}
