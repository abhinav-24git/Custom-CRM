import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const { expected_date } = json;

    const result = await prisma.$transaction(async (tx) => {
      const rfq = await tx.jobWorkRFQ.findUnique({
        where: { id },
        include: { quotes: { include: { supplier: true } } }
      });

      if (!rfq) {
        throw new Error('Job Work RFQ not found');
      }

      const selectedQuote = rfq.quotes.find(q => q.is_selected);
      if (!selectedQuote) {
        throw new Error('No winning quote selected. Please select a quote before generating a Service Order.');
      }

      const count = await tx.serviceOrder.count();
      const service_order_number = `SO-JW-${String(count + 1).padStart(4, '0')}`;

      const serviceOrder = await tx.serviceOrder.create({
        data: {
          service_order_number,
          jobwork_rfq_id: rfq.id,
          jobwork_quote_id: selectedQuote.id,
          supplier_id: selectedQuote.supplier_id,
          process: rfq.process,
          ordered_qty: rfq.qty,
          rate: selectedQuote.rate,
          amount: selectedQuote.amount,
          expected_date: expected_date ? new Date(expected_date) : null,
          status: 'Issued'
        },
        include: {
          supplier: true,
          jobwork_rfq: true
        }
      });

      // Close the RFQ
      await tx.jobWorkRFQ.update({
        where: { id: rfq.id },
        data: { status: 'Closed' }
      });

      return serviceOrder;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate Service Order' }, { status: 400 });
  }
}
