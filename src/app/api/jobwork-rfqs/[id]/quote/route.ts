import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const { supplier_id, rate, lead_time_days } = json;

    if (!supplier_id || rate === undefined || rate === null) {
      return NextResponse.json({ error: 'Supplier and rate are required' }, { status: 400 });
    }

    const rateNum = parseFloat(rate);
    if (rateNum < 0) {
      return NextResponse.json({ error: 'Rate must be >= 0' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const rfq = await tx.jobWorkRFQ.findUnique({
        where: { id },
        include: { suppliers: true, quotes: true }
      });

      if (!rfq) {
        throw new Error('Job Work RFQ not found');
      }

      if (rfq.status === 'Closed') {
        throw new Error('Cannot add quotes to a Closed RFQ');
      }

      const isInvited = rfq.suppliers.some(s => s.supplier_id === supplier_id);
      if (!isInvited) {
        throw new Error('This supplier was not invited to this Job Work RFQ');
      }

      const existingQuote = rfq.quotes.find(q => q.supplier_id === supplier_id);
      if (existingQuote) {
        throw new Error('A quote has already been submitted for this supplier');
      }

      const amount = rateNum * rfq.qty;

      const quote = await tx.jobWorkQuote.create({
        data: {
          jobwork_rfq_id: rfq.id,
          supplier_id,
          rate: rateNum,
          lead_time_days: lead_time_days ? parseInt(lead_time_days, 10) : null,
          amount,
          is_selected: false
        },
        include: { supplier: true }
      });

      // Update RFQ status to 'Quotes Received' if currently Draft or Sent
      if (rfq.status === 'Draft' || rfq.status === 'Sent') {
        await tx.jobWorkRFQ.update({
          where: { id: rfq.id },
          data: { status: 'Quotes Received' }
        });
      }

      return quote;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit quote' }, { status: 400 });
  }
}
